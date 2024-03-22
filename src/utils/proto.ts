import fs from 'fs'
import { Project } from 'ts-morph'
import { exec } from 'child_process'
import { Octokit } from '@octokit/rest'
import { Base64 } from 'js-base64'
import { OctokitResponse } from '@octokit/types'
import { config } from 'dotenv'
config()
// define type
type BodyDefinitionType = {
  name: string
  fields: { name: string; type: string }[]
}

// 'pbjs -t static-module -w es6 -o ./typeLib/reqResTypeRelease.js ./reqResType.proto',
// funcs support
// renderFileDType: hàm render từ file proto thành file .d.ts
const renderFileDType = async () => {
  return new Promise<string>((resolve, reject) => {
    exec(
      'pbjs -t static-module -w es6 -o ./typeLib/reqResTypeRelease.js ./reqResType.proto && pbts -o ./typeLib/reqResTypeRelease.d.ts ./typeLib/reqResTypeRelease.js',
      (error, stdout, stderr) => {
        if (error) {
          reject(`exec error: ${error}`)
        }
        resolve('Success to render file .d.ts')
      }
    )
  })
}

//hàm clone 1 file bất kỳ ra 1 file khác
const cloneFile = (sourcePath: string, destinationPath: string) => {
  // Đọc nội dung của file nguồn
  return new Promise<string>((resolve, reject) => {
    fs.readFile(sourcePath, 'utf8', (err, data) => {
      if (err) {
        throw reject('Error reading source file')
      }

      // Ghi nội dung của file nguồn vào file đích
      fs.writeFile(destinationPath, data, 'utf8', (err) => {
        if (err) {
          throw reject('Error writing destination file:')
        }
        resolve('File cloned successfully.')
      })
    })
  })
}
//hàm đọc nội dung của một file bất kỳ
const readFileGetContent = (path: string) => {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, content) => {
      if (err) {
        reject('Error reading file: ' + err)
      }
      // In nội dung của file

      resolve(content)
    })
  })
}

const trackingAutoPush = async ({
  directoryToWatch,
  childRepoPath
}: {
  directoryToWatch: string
  childRepoPath: string
}) => {}

class ProtobufjsRender {
  fileProtoName: string
  protoContent: string
  definitions: {
    reqResBodies: BodyDefinitionType[]
  }
  constructor(fileProtoName?: string) {
    this.definitions = {
      reqResBodies: []
    }
    this.fileProtoName = fileProtoName || 'reqResType.proto'
    this.protoContent = `syntax = "proto3";\n`
  }
  // hàm đọc file là vấy ra các interface và các properties có trong file
  extractDetails(filePath: string) {
    const project = new Project()
    const sourceFile = project.addSourceFileAtPath(filePath)

    const interfaces = sourceFile.getInterfaces()
    const enums = sourceFile.getEnums()

    const interfaceDetails = interfaces.map((interfaceDeclaration) => {
      const properties = interfaceDeclaration.getProperties()
      const details = properties.map((property) => {
        return {
          name: property.getName(),
          type: property.getType().getText()
        }
      })

      return {
        interfaceName: interfaceDeclaration.getName(),
        properties: details
      }
    })

    const enumDetails = enums.map((enumDeclaration) => {
      const members = enumDeclaration.getMembers()
      const details = members.map((member) => {
        return {
          name: member.getName(),
          value: member.getValue()
        }
      })

      return {
        enumName: enumDeclaration.getName(),
        members: details
      }
    })

    return {
      interfaces: interfaceDetails,
      enums: enumDetails
    }
  }
  addBodyDefinition(bodyDefinitionType: BodyDefinitionType) {
    this.definitions.reqResBodies.push(bodyDefinitionType)
  }

  createMessageDefinition(bodyDefinitionType: BodyDefinitionType) {
    let messageDefinition = `message ${bodyDefinitionType.name} {\n`
    bodyDefinitionType.fields.forEach((field, index) => {
      messageDefinition += `  ${field.type == 'number' ? 'int32' : field.type} ${field.name} = ${index + 1};\n`
    })
    messageDefinition += '}\n'
    return messageDefinition
  }

  async updateProtoFile() {
    const current = await readFileGetContent(this.fileProtoName)

    this.definitions.reqResBodies.forEach((bodyDefinitionType: BodyDefinitionType) => {
      this.protoContent += this.createMessageDefinition(bodyDefinitionType)
    })
    if (current === this.protoContent) {
      console.log(`File ${this.fileProtoName} change nothing`)
    } else {
      await (async () => {
        fs.writeFileSync(this.fileProtoName, this.protoContent)
      })()

      const fileTsPre = await readFileGetContent('./typeLib/reqResTypeRelease.d.ts')
      try {
        const renderTsResult = await renderFileDType()
        console.log('renderTsResult: ', renderTsResult)
      } catch (err) {
        console.log('ERROR renderTs: ', err)
      }
      const fileTsAfter = await readFileGetContent('./typeLib/reqResTypeRelease.d.ts')
      const fileJsAfter = await readFileGetContent('./typeLib/reqResTypeRelease.js')

      if (fileTsPre != fileTsAfter) {
        console.log('TWO FILE IS DIFFERENT, PREPARE TO PUSH')
        console.log('TOKEN AUT: ', process.env.GITHUB_TOKEN)
        // Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

        // Compare: https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
        await octokit.rest.users.getAuthenticated()
        console.log('Authenticated')

        try {
          // THIS IS reqResTypeRelease.d.TS
          const shaNew: OctokitResponse<any> = await octokit.rest.repos.getContent({
            owner: 'LeHoDiep',
            repo: 'typeLib',
            path: 'reqResTypeRelease.d.ts'
          })

          await octokit.rest.repos.createOrUpdateFileContents({
            owner: 'LeHoDiep',
            repo: 'typeLib',
            path: 'reqResTypeRelease.d.ts',
            message: new Date().toISOString(),
            content: Base64.encode(fileTsAfter),
            branch: 'main',
            sha: shaNew.data.sha
          })

          // THIS IS reqResTypeRelease.d.JS
          const shaNewJS: OctokitResponse<any> = await octokit.rest.repos.getContent({
            owner: 'LeHoDiep',
            repo: 'typeLib',
            path: 'reqResTypeRelease.js'
          })

          await octokit.rest.repos.createOrUpdateFileContents({
            owner: 'LeHoDiep',
            repo: 'typeLib',
            path: 'reqResTypeRelease.js',
            message: new Date().toISOString(),
            content: Base64.encode(fileJsAfter),
            branch: 'main',
            sha: shaNewJS.data.sha
          })

          console.log('PUSH SUCCESS')
        } catch (error) {
          console.log('error createOrUpdateFileContents: ', error)
        }

        //   try {
        //     const git = simpleGit('./typeLib')
        //     const addResult = await git.add(['./reqResTypeRelease.d.ts', './reqResTypeRelease.js'])
        //     console.log('addResult: ', addResult)

        //     const commitResult = git.commit(`ChangeType: ${new Date().toISOString()}`).push(['origin', 'main'])
        //     console.log('commitResult: ', commitResult)

        //     const pushResult = await git.push(['origin', 'main'])
        //     console.log('pushResult: ', pushResult)

        //     console.log('PUSH SUCCESS')
        //   } catch (err) {
        //     console.log('error get content: ', err)
        //   }
      }
    }
  }

  async renderProtoFile(filePathList: string[]) {
    filePathList.forEach((filePath) => {
      const { enums, interfaces } = this.extractDetails(filePath)
      interfaces.forEach((interfaceDetail) => {
        const bodyDefinitionType = {
          name: interfaceDetail.interfaceName,
          fields: interfaceDetail.properties
        }
        this.addBodyDefinition(bodyDefinitionType)
      })
      enums.forEach((enumDetail) => {
        const bodyDefinitionType = {
          name: enumDetail.enumName,
          fields: enumDetail.members.map((member) => {
            return {
              name: member.name,
              type: 'int32'
            }
          })
        }
        this.addBodyDefinition(bodyDefinitionType)
      })
    })
    await this.updateProtoFile()
  }
}

const protobufjsRender = new ProtobufjsRender()
export default protobufjsRender

//
protobufjsRender.renderProtoFile(['src/models/requests/User.requests.ts', 'src/constants/enums.ts'])
