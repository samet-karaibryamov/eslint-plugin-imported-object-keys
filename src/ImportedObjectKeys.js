'use strict'

import fs from 'fs'
import parse from 'eslint-module-utils/parse'
import resolve from 'eslint-module-utils/resolve'

const exportedObjects = {}
const registerExportedObjects = (importNode, context) => {
  const path = resolve(importNode.source.value, context)
  if (exportedObjects[path]) return

  const content = fs.readFileSync(path, { encoding: 'utf8' })
  const ast = parse(path, content, context)

  exportedObjects[path] = {}
  ast.body.forEach((node) => {
    switch (node.type) {
      case 'ExportDefaultDeclaration':
        exportedObjects[path]['default'] = node.declaration.properties.map(p => p.key.name)
        break
    }
  })
}

export default {
  meta: {
    type: 'problem',

    docs: {
      description: 'disallow duplicate keys in object literals',
      category: 'Possible Errors',
      recommended: true,
      url: 'https://github.com/samet-karaibryamov/eslint-plugin-imported-object-keys'
    },

    schema: [],

    messages: {
      invalidKey: `Invalid key '{{propertyName}}' for imported object '{{objectName}}'.`
    }
  },

  create(context) {
     const importedObjects = {}
     const registerImportedObjects = (importNode) => {
       const path = resolve(importNode.source.value, context)
       importNode.specifiers.forEach(node => {
         switch (node.type) {
           case 'ImportDefaultSpecifier':
             importedObjects[node.local.name] = exportedObjects[path]['default']
             break
         }
       })
     }
 
     return {
       ImportDeclaration(node) {
         registerExportedObjects(node, context)
         registerImportedObjects(node)
       },
       MemberExpression(node) {
         let validKeys = importedObjects[node.object.name]
         if (validKeys && !validKeys.includes(node.property.name)) {
           context.report({
             node: node,
             loc: node.loc,
             messageId: 'invalidKey',
             data: {
               objectName: node.object.name,
               propertyName: node.property.name,
             }
           });
         }
       }
     };
  }
};