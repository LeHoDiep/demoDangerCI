import fs from 'fs'
import { Project } from 'ts-morph'

type BodyDefinitionType = {
  name: string
  fields: { name: string; type: string }[]
}

// hàm đọc file là vấy ra các interface và các properties có trong file
function extractDetails(filePath: string) {
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

class ProtobufjsRender {
  fileProtoName: string
  protoContent: string
  definitions: {
    reqResBodies: BodyDefinitionType[]
  }
  constructor() {
    this.definitions = {
      reqResBodies: []
    }
    this.fileProtoName = 'reqResType.proto'
    this.protoContent = `syntax = "proto3";\n`
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

  updateProtoFile() {
    this.definitions.reqResBodies.forEach((bodyDefinitionType: BodyDefinitionType) => {
      this.protoContent += this.createMessageDefinition(bodyDefinitionType)
    })

    fs.writeFileSync(this.fileProtoName, this.protoContent)
    console.log(`File ${this.fileProtoName} đã được cập nhật thành công.`)
  }
}

export const renderProtoFile = (filePathList: string[]) => {
  const protobufRender = new ProtobufjsRender()

  filePathList.forEach((filePath) => {
    const { enums, interfaces } = extractDetails(filePath)
    interfaces.forEach((interfaceDetail) => {
      const bodyDefinitionType = {
        name: interfaceDetail.interfaceName,
        fields: interfaceDetail.properties
      }
      protobufRender.addBodyDefinition(bodyDefinitionType)
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
      protobufRender.addBodyDefinition(bodyDefinitionType)
    })
  })
  protobufRender.updateProtoFile()
}
