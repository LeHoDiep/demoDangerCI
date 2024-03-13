import path from 'path'
import fs from 'fs'
import { Request } from 'express'
import formidable, { File } from 'formidable'
import { Files } from 'formidable'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR, UPLOAD_VIDEO_TEMP_DIR } from '~/constants/dir'

export const initFolder = () => {
  ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true //cho phép tạo folder nested vào nhau
      })
    }
  })
}

// hinhanhdep.png => hinhanhdep
export const getNameFromFullname = (filename: string) => {
  const nameArr = filename.split('.')
  nameArr.pop()
  return nameArr.join('')
}

// videoNgocTrinhTeXe.ducati.paginale.mp4 => mp4
export const getExtention = (filename: string) => {
  const nameArr = filename.split('.') //[videoNgocTrinhTeXe, ducati, paginale, mp4]
  return nameArr[nameArr.length - 1]
}

//hàm xử lý file mà client đã gữi lên
export const handleUploadImage = async (req: Request) => {
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_IMAGE_TEMP_DIR),
    maxFiles: 4,
    keepExtensions: true,
    maxFileSize: 300 * 1024 * 4,
    filter: function ({ name, originalFilename, mimetype }) {
      const valid = name === 'image' && Boolean(mimetype?.includes('image/'))
      if (!valid) {
        form.emit('error' as any, new Error('File type is not valid') as any)
      }
      return valid
    }
  })

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!files.image) {
        return reject(new Error('Image is empty'))
      }
      return resolve(files.image as File[])
    })
  })
}

export const handleUploadVideo = async (req: Request) => {
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_VIDEO_DIR),
    maxFiles: 1,
    // keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, //50mb
    filter: function ({ name, originalFilename, mimetype }) {
      const valid = name === 'video' && Boolean(mimetype?.includes('video/'))
      if (!valid) {
        form.emit('error' as any, new Error('File type is not valid') as any)
      }
      return valid
    }
  })

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!files.video) {
        return reject(new Error('Video is empty'))
      }
      //trong file{originalFilename, filepath, newFilename}
      //vì mình đã tắt keepExtensions nên file sẽ không có 'đuôi của file'
      const videos = files.video as File[] //lấy ra danh sách các video đã upload
      //duyệt qua từng video và
      videos.forEach((video) => {
        const ext = getExtention(video.originalFilename as string) //lấy đuôi của tên gốc
        video.newFilename += `.${ext}` //lắp đuôi vào tên mới
        fs.renameSync(video.filepath, `${video.filepath}.${ext}`) //lắp đuôi vào filepath: đường dẫn đến file mới
      })
      return resolve(files.video as File[])
    })
  })
}
