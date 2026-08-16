import { Request, Response, NextFunction } from 'express'
import multer, { FileFilterCallback } from 'multer'
import ApiError from '../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

type IFolderName = 'images' | 'icon' | 'media' | 'documents'
interface ProcessedFiles {
  [key: string]: string | string[] | undefined
}

const MAX_UPLOAD_SIZE_MB = Number(process.env.SERVER_UPLOAD_MAX_FILE_SIZE_MB || '200')
const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/3gpp',
  'video/3gpp2',
  'video/x-matroska',
  'video/x-msvideo',
  'video/avi',
  'video/mpeg',
  'video/x-ms-wmv',
  'video/x-flv',
]

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'image/gif',
]

const MIME_EXTENSION: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'video/3gpp2': '3g2',
  'video/x-matroska': 'mkv',
  'video/x-msvideo': 'avi',
  'video/avi': 'avi',
  'video/mpeg': 'mpeg',
  'video/x-ms-wmv': 'wmv',
  'video/x-flv': 'flv',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
}

const getUploadExtension = (file: Express.Multer.File): string => {
  const fromName = path.extname(file.originalname).replace('.', '').toLowerCase()
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName
  return MIME_EXTENSION[file.mimetype] || file.mimetype.split('/')[1] || 'bin'
}

const handleMulterError = (error: any, next: NextFunction) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return next(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        `File too large. Images and videos can be up to ${MAX_UPLOAD_SIZE_MB}MB.`,
      ),
    )
  }
  return next(error)
}

// Define upload configuration with maxCount information
const uploadFields = [
  { name: 'images', maxCount: 10 },
  { name: 'icon', maxCount: 1 },
  { name: 'media', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
] as const

export const fileAndBodyProcessor = () => {
  const storage = multer.memoryStorage()

  // File filter configuration
  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    try {
      const allowedTypes = {
        images: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
        icon: IMAGE_MIME_TYPES,
        media: [
          ...IMAGE_MIME_TYPES,
          ...VIDEO_MIME_TYPES,
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
        ],
        documents: ['application/pdf', ...IMAGE_MIME_TYPES],
      }

      const fieldType = file.fieldname as IFolderName
      const ext = path.extname(file.originalname).toLowerCase()
      const isVideoByExt = [
        '.mp4',
        '.mov',
        '.webm',
        '.mkv',
        '.avi',
        '.wmv',
        '.flv',
        '.m4v',
        '.3gp',
        '.ogv',
        '.mpeg',
        '.mpg',
      ].includes(ext)
      const mimeOk = allowedTypes[fieldType]?.includes(file.mimetype)
      const videoFallback =
        (fieldType === 'images' || fieldType === 'media') &&
        isVideoByExt &&
        (!file.mimetype ||
          file.mimetype === 'application/octet-stream' ||
          file.mimetype.startsWith('video/'))
      if (!mimeOk && !videoFallback) {
        return cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `Invalid file type for ${file.fieldname}`,
          ),
        )
      }
      cb(null, true)
    } catch (error) {
      cb(
        new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'File validation failed',
        ),
      )
    }
  }

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 20,
    },
  }).fields(uploadFields)

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, async error => {
      if (error) return handleMulterError(error, next)

      try {
        // Parse JSON data if exists
        if (req.body?.data) {
          req.body = JSON.parse(req.body.data)
        }

        // Process uploaded files
        if (req.files) {
          const processedFiles: ProcessedFiles = {}
          const fieldsConfig = new Map(
            uploadFields.map(f => [f.name, f.maxCount]),
          )

          // Process each uploaded field
          for (const [fieldName, files] of Object.entries(req.files)) {
            const maxCount = fieldsConfig.get(fieldName as IFolderName) ?? 1
            const fileArray = files as Express.Multer.File[]
            const paths: string[] = []

            // Process each file - with image optimization for image types
            for (const file of fileArray) {
              const extension = getUploadExtension(file)
              const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
              const filePath = `/uploads/${fieldName}/${filename}`

              // Apply Sharp optimization for images
              if (
                ['images', 'icon', 'media'].includes(fieldName) &&
                file.mimetype.startsWith('image/')
              ) {
                try {
                  // Create Sharp instance
                  let sharpInstance = sharp(file.buffer).resize(800)

                  // Preserve original format
                  if (file.mimetype === 'image/png') {
                    sharpInstance = sharpInstance.png({ quality: 80 })
                  } else {
                    sharpInstance = sharpInstance.jpeg({ quality: 80 })
                  }

                  const optimizedBuffer = await sharpInstance.toBuffer()

                  // Replace the original buffer with optimized one
                  file.buffer = optimizedBuffer
                } catch (err) {
                  console.error('Image optimization failed:', err)
                }
              }

              // Save file to disk
              const uploadsDir = path.join(process.cwd(), 'uploads', fieldName)
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true })
              }
              fs.writeFileSync(
                path.join(process.cwd(), 'uploads', fieldName, filename),
                file.buffer,
              )

              paths.push(filePath)
            }

            // Store as array or single value based on maxCount
            processedFiles[fieldName] = maxCount > 1 ? paths : paths[0]
          }

          // Merge arrays instead of overwriting for list fields
          for (const [fieldName, value] of Object.entries(processedFiles)) {
            if (Array.isArray(req.body[fieldName]) && Array.isArray(value)) {
              req.body[fieldName] = [...req.body[fieldName], ...value]
            } else if (Array.isArray(req.body[fieldName]) && typeof value === 'string') {
              req.body[fieldName] = [...req.body[fieldName], value]
            } else {
              req.body[fieldName] = value
            }
          }
        }

        next()
      } catch (err) {
        next(err)
      }
    })
  }
}

// Utility function to generate random string
function generateRandomString(length: number = 9): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
}

export const fileAndBodyProcessorUsingDiskStorage = () => {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  // Configure storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const folderPath = path.join(uploadsDir, file.fieldname)
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
      }
      cb(null, folderPath)
    },
    filename: (req, file, cb) => {
      const extension = getUploadExtension(file)
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
      cb(null, filename)
    },
  })

  // File filter configuration
  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    try {
      const allowedTypes = {
        images: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
        icon: IMAGE_MIME_TYPES,
        media: [
          ...IMAGE_MIME_TYPES,
          ...VIDEO_MIME_TYPES,
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
        ],
        documents: ['application/pdf', ...IMAGE_MIME_TYPES],
      }

      const fieldType = file.fieldname as IFolderName
      const ext = path.extname(file.originalname).toLowerCase()
      const isVideoByExt = [
        '.mp4',
        '.mov',
        '.webm',
        '.mkv',
        '.avi',
        '.wmv',
        '.flv',
        '.m4v',
        '.3gp',
        '.ogv',
        '.mpeg',
        '.mpg',
      ].includes(ext)
      const mimeOk = allowedTypes[fieldType]?.includes(file.mimetype)
      const videoFallback =
        (fieldType === 'images' || fieldType === 'media') &&
        isVideoByExt &&
        (!file.mimetype ||
          file.mimetype === 'application/octet-stream' ||
          file.mimetype.startsWith('video/'))
      if (!mimeOk && !videoFallback) {
        return cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `Invalid file type for ${file.fieldname}`,
          ),
        )
      }
      cb(null, true)
    } catch (error) {
      cb(
        new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'File validation failed',
        ),
      )
    }
  }

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: 20,
    },
  }).fields(uploadFields)

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, async error => {
      if (error) return handleMulterError(error, next)

      try {
        // Parse JSON data if exists
        if (req.body?.data) {
          req.body = JSON.parse(req.body.data)
        }

        // Process uploaded files
        if (req.files) {
          const processedFiles: ProcessedFiles = {}
          const fieldsConfig = new Map(
            uploadFields.map(f => [f.name, f.maxCount]),
          )

          // Process each uploaded field
          for (const [fieldName, files] of Object.entries(req.files)) {
            const maxCount = fieldsConfig.get(fieldName as IFolderName) ?? 1
            const fileArray = files as Express.Multer.File[]
            const paths: string[] = []

            // Process each file - with image optimization for image types
            for (const file of fileArray) {
              const filePath = `/uploads/${fieldName}/${file.filename}`

              // Apply Sharp optimization for images
              if (
                ['images', 'icon', 'media'].includes(fieldName) &&
                file.mimetype.startsWith('image/')
              ) {
                try {
                  const fullPath = path.join(
                    uploadsDir,
                    fieldName,
                    file.filename,
                  )

                  // Create Sharp instance
                  let sharpInstance = sharp(fullPath).resize(800)

                  // Preserve original format
                  if (file.mimetype === 'image/png') {
                    sharpInstance = sharpInstance.png({ quality: 80 })
                  } else if (file.mimetype === 'image/webp') {
                    sharpInstance = sharpInstance.webp({ quality: 80 })
                  } else {
                    sharpInstance = sharpInstance.jpeg({ quality: 80 })
                  }

                  // Optimize the image file
                  await sharpInstance.toFile(fullPath + '.optimized')

                  // Replace original with optimized version
                  fs.unlinkSync(fullPath)
                  fs.renameSync(fullPath + '.optimized', fullPath)
                } catch (err) {
                  console.error('Image optimization failed:', err)
                }
              }

              paths.push(filePath)
            }

            // Store as array or single value based on maxCount
            processedFiles[fieldName] = maxCount > 1 ? paths : paths[0]
          }

          // Merge arrays instead of overwriting for list fields
          for (const [fieldName, value] of Object.entries(processedFiles)) {
            if (Array.isArray(req.body[fieldName]) && Array.isArray(value)) {
              req.body[fieldName] = [...req.body[fieldName], ...value]
            } else if (Array.isArray(req.body[fieldName]) && typeof value === 'string') {
              req.body[fieldName] = [...req.body[fieldName], value]
            } else {
              req.body[fieldName] = value
            }
          }
        }

        next()
      } catch (err) {
        next(err)
      }
    })
  }
}
