import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import fs from 'fs'
import ApiError from '../../errors/ApiError'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'
import { AwardConfigServices } from './awardConfig.service'
import { AwardConfig } from './awardConfig.model'
import { localizeDocument } from '../../helpers/localize'


const awardFields = ['title', 'description']

const getAllAwardConfigs = catchAsync(async (req: Request, res: Response) => {
  const result = await AwardConfigServices.getAllAwardConfigs()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Award configurations retrieved successfully',
    data: localizeDocument(result, req.lang, awardFields),
  })
})

const updateAwardConfig = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  // Process uploaded files if present
  if (req.body.icon) {
    req.body.coverPhoto = req.body.icon
  }
  if (req.body.documents) {
    // If documents is an array, take the first item, otherwise use it directly
    req.body.fileUrl = Array.isArray(req.body.documents)
      ? req.body.documents[0]
      : req.body.documents
  }
  if (req.body.fileUrl === '') {
    req.body.originalFileName = ''
  }

  const result = await AwardConfigServices.updateAwardConfig(id, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Award configuration updated successfully',
    data: localizeDocument(result, req.lang, awardFields),
  })
})

const createAwardConfig = catchAsync(async (req: Request, res: Response) => {
  if (req.body.icon) {
    req.body.coverPhoto = req.body.icon
  }
  if (req.body.documents) {
    req.body.fileUrl = Array.isArray(req.body.documents)
      ? req.body.documents[0]
      : req.body.documents
  }
  const result = await AwardConfigServices.createAwardConfig(req.body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Award configuration created successfully',
    data: localizeDocument(result, req.lang, awardFields),
  })
})

const deleteAwardConfig = catchAsync(async (req: Request, res: Response) => {
  const result = await AwardConfigServices.deleteAwardConfig(req.params.id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Award configuration deleted successfully',
    data: result,
  })
})

const downloadAwardPdf = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const config = await AwardConfig.findById(id)
  if (!config || !config.fileUrl) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Downloadable file not found for this reward')
  }

  // Determine original filename
  let filename = config.originalFileName
  if (!filename) {
    const rawTitle =
      typeof config.title === 'object'
        ? (config.title as any)?.es || (config.title as any)?.en || 'Itinerario'
        : config.title || 'Itinerario'
    filename = `${String(rawTitle)
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')}.pdf`
  }
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename += '.pdf'
  }

  const relativePath = config.fileUrl.startsWith('/') ? config.fileUrl.slice(1) : config.fileUrl
  const fullPath = path.join(process.cwd(), relativePath)

  if (fs.existsSync(fullPath)) {
    return res.download(fullPath, filename)
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
  return res.redirect(config.fileUrl)
})

export const AwardConfigController = {
  getAllAwardConfigs,
  updateAwardConfig,
  createAwardConfig,
  deleteAwardConfig,
  downloadAwardPdf,
}

