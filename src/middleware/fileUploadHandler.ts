import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import multer, { FileFilterCallback } from 'multer'
import sharp from 'sharp'
import ApiError from '../errors/ApiError'

const fileUploadHandler = () => {
  // Configure storage (use memory for in-process transformations)
  const storage = multer.memoryStorage()

  // File filter: synchronous function expected by multer
  const validateFile = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    try {
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
      const allowedMediaTypes = [
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
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
      ]
      const imageFields = ['image', 'license', 'signature', 'businessProfile']
      // Images
      if (imageFields.includes(file.fieldname)) {
        if (allowedImageTypes.includes(file.mimetype)) cb(null, true)
        else
          cb(
            new ApiError(
              StatusCodes.BAD_REQUEST,
              'Only .jpeg, .png, .jpg file supported',
            ),
          )
        return
      }

      // Media (videos/audio)
      if (file.fieldname === 'media' || file.fieldname === 'clips') {
        if (allowedMediaTypes.includes(file.mimetype)) cb(null, true)
        else
          cb(
            new ApiError(
              StatusCodes.BAD_REQUEST,
              'Only .mp4, .mov, .webm, .ogg, .mp3, .wav file supported',
            ),
          )
        return
      }

      // Documents
      if (file.fieldname === 'doc') {
        const allowedDocTypes = ['application/pdf']
        if (allowedDocTypes.includes(file.mimetype)) cb(null, true)
        else cb(new ApiError(StatusCodes.BAD_REQUEST, 'Only pdf supported'))
        return
      }

      // Unknown field
      cb(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          'This file field is not supported',
        ),
      )
    } catch (error) {
      cb(
        new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'File validation failed',
        ),
      )
    }
  }

  // Configure multer
  const upload = multer({
    storage: storage,
    fileFilter: validateFile,
    limits: {
      fileSize: Number(process.env.SERVER_UPLOAD_MAX_FILE_SIZE_MB || '200') * 1024 * 1024,
      files: 20,
    },
  }).fields([
    { name: 'image', maxCount: 10 },
    { name: 'media', maxCount: 10 },
    { name: 'doc', maxCount: 5 },
    { name: 'clips', maxCount: 10 },
  ])

  // Process uploaded images with Sharp
  const processImages = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.files) return next()

    try {
      const imageFields = ['image', 'license', 'signature', 'businessProfile']

      // Process each image field
      for (const field of imageFields) {
        const files = (req.files as any)[field]
        if (!files) continue

        // Process each file in the field
        for (const file of files) {
          if (!file.mimetype.startsWith('image')) continue

          // Resize and optimize the image
          // Use fit: 'inside' to preserve aspect ratio, limiting size to 1080x1350
          const transformer = sharp(file.buffer).resize({
            width: 1080,
            height: 1350,
            fit: 'inside',
          })

          // Preserve format and compress appropriately
          let optimizedBuffer
          const mimetype = file.mimetype
          if (mimetype === 'image/png') {
            optimizedBuffer = await transformer.png({ quality: 80 }).toBuffer()
          } else {
            // Default to jpeg for jpg/jpeg or unknown
            optimizedBuffer = await transformer.jpeg({ quality: 80 }).toBuffer()
          }

          // Replace the original buffer with the optimized one
          file.buffer = optimizedBuffer
        }
      }
      next()
    } catch (error) {
      next(
        new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Image processing failed',
        ),
      )
    }
  }

  // Return middleware chain
  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, err => {
      if (err) {
        if ((err as any)?.code === 'LIMIT_FILE_SIZE') {
          const maxMb = Number(process.env.SERVER_UPLOAD_MAX_FILE_SIZE_MB || '200')
          return next(
            new ApiError(
              StatusCodes.BAD_REQUEST,
              `File too large. Images and videos can be up to ${maxMb}MB.`,
            ),
          )
        }
        return next(err)
      }
      processImages(req, res, next)
    })
  }
}

export default fileUploadHandler
