/**
 * ByteBook — PDF.js Worker Patch Script
 * Fixes "FormatError: Pages tree contains circular reference." in `pdfjs-dist` when opening
 * ebooks (such as Grokking Algorithms) that reuse the same PDF `/Page` object reference for multiple
 * blank pages or contain cyclic `/Pages` kids references.
 */

const fs = require('fs');
const path = require('path');

const unminifiedFiles = [
  path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.js'),
  path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js'),
];

const minifiedFiles = [
  path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.js'),
  path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
];

for (const filePath of unminifiedFiles) {
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Patch getPageDict(pageIndex) so leaf /Page nodes never trigger circular reference errors,
  //    and cyclic /Pages branch nodes are skipped cleanly instead of throwing FormatError.
  const targetGetPageDict = `        if (visitedNodes.has(currentNode)) {
          throw new _util.FormatError("Pages tree contains circular reference.");
        }
        visitedNodes.put(currentNode);
        const obj = await xref.fetchAsync(currentNode);
        if (obj instanceof _primitives.Dict) {
          let type = obj.getRaw("Type");
          if (type instanceof _primitives.Ref) {
            type = await xref.fetchAsync(type);
          }
          if ((0, _primitives.isName)(type, "Page") || !obj.has("Kids")) {
            if (!pageKidsCountCache.has(currentNode)) {
              pageKidsCountCache.put(currentNode, 1);
            }
            if (!pageIndexCache.has(currentNode)) {
              pageIndexCache.put(currentNode, currentPageIndex);
            }
            if (currentPageIndex === pageIndex) {
              return [obj, currentNode];
            }
            currentPageIndex++;
            continue;
          }
        }
        nodesToVisit.push(obj);`;

  const replacementGetPageDict = `        const obj = await xref.fetchAsync(currentNode);
        if (obj instanceof _primitives.Dict) {
          let type = obj.getRaw("Type");
          if (type instanceof _primitives.Ref) {
            type = await xref.fetchAsync(type);
          }
          if ((0, _primitives.isName)(type, "Page") || !obj.has("Kids")) {
            if (!pageKidsCountCache.has(currentNode)) {
              pageKidsCountCache.put(currentNode, 1);
            }
            if (!pageIndexCache.has(currentNode)) {
              pageIndexCache.put(currentNode, currentPageIndex);
            }
            if (currentPageIndex === pageIndex) {
              return [obj, currentNode];
            }
            currentPageIndex++;
            continue;
          }
        }
        if (visitedNodes.has(currentNode)) {
          continue;
        }
        visitedNodes.put(currentNode);
        nodesToVisit.push(obj);`;

  if (content.includes(targetGetPageDict)) {
    content = content.replace(targetGetPageDict, replacementGetPageDict);
  }

  // 2. Patch getAllPageDicts() so shared blank /Page refs or cyclic /Pages branch refs don't break
  const targetGetAllPageDicts = `      if (kidObj instanceof _primitives.Ref) {
        if (visitedNodes.has(kidObj)) {
          addPageError(new _util.FormatError("Pages tree contains circular reference."));
          break;
        }
        visitedNodes.put(kidObj);
        try {
          obj = await xref.fetchAsync(kidObj);
        } catch (ex) {
          addPageError(ex);
          break;
        }
      } else {
        obj = kidObj;
      }
      if (!(obj instanceof _primitives.Dict)) {
        addPageError(new _util.FormatError("Page dictionary kid reference points to wrong type of object."));
        break;
      }
      let type = obj.getRaw("Type");
      if (type instanceof _primitives.Ref) {
        try {
          type = await xref.fetchAsync(type);
        } catch (ex) {
          addPageError(ex);
          break;
        }
      }
      if ((0, _primitives.isName)(type, "Page") || !obj.has("Kids")) {
        addPageDict(obj, kidObj instanceof _primitives.Ref ? kidObj : null);
      } else {
        queue.push({
          currentNode: obj,
          posInKids: 0
        });
      }`;

  const replacementGetAllPageDicts = `      if (kidObj instanceof _primitives.Ref) {
        try {
          obj = await xref.fetchAsync(kidObj);
        } catch (ex) {
          addPageError(ex);
          break;
        }
      } else {
        obj = kidObj;
      }
      if (!(obj instanceof _primitives.Dict)) {
        addPageError(new _util.FormatError("Page dictionary kid reference points to wrong type of object."));
        break;
      }
      let type = obj.getRaw("Type");
      if (type instanceof _primitives.Ref) {
        try {
          type = await xref.fetchAsync(type);
        } catch (ex) {
          addPageError(ex);
          break;
        }
      }
      if ((0, _primitives.isName)(type, "Page") || !obj.has("Kids")) {
        addPageDict(obj, kidObj instanceof _primitives.Ref ? kidObj : null);
      } else {
        if (kidObj instanceof _primitives.Ref) {
          if (visitedNodes.has(kidObj)) {
            queueItem.posInKids++;
            continue;
          }
          visitedNodes.put(kidObj);
        }
        queue.push({
          currentNode: obj,
          posInKids: 0
        });
      }`;

  if (content.includes(targetGetAllPageDicts)) {
    content = content.replace(targetGetAllPageDicts, replacementGetAllPageDicts);
  }

  // 3. Also ensure any remaining "Page index ${pageIndex} not found." returns an empty Dict instead of throwing
  content = content.replace(
    'throw new Error(`Page index ${pageIndex} not found.`);',
    'return [_primitives.Dict.empty, null];'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ByteBook Patch] Patched:', filePath);
}

for (const minPath of minifiedFiles) {
  if (!fs.existsSync(minPath)) continue;
  let minContent = fs.readFileSync(minPath, 'utf8');
  minContent = minContent.replace(
    'if(a.has(r))throw new n.FormatError("Pages tree contains circular reference.");a.put(r);',
    ''
  );
  minContent = minContent.replace(
    'if(s.has(c)){addPageError(new n.FormatError("Pages tree contains circular reference."));break}s.put(c);',
    ''
  );
  fs.writeFileSync(minPath, minContent, 'utf8');
  console.log('[ByteBook Patch] Patched minified:', minPath);
}
