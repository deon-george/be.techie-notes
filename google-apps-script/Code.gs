/**
 * B.Tech Notes — Google Drive read-only catalog.
 * Deploy as Web App: Execute as ME; Who has access: Anyone.
 * IMPORTANT: This intentionally exposes folder/file names and links to visitors.
 * Only deploy if the materials are permitted to be listed publicly.
 */
const ROOT_FOLDER_ID = '1wls3_9Y_tgoV9Twq8bsiIo3wkrxkcoQ6';
const MAX_SCAN_DEPTH = 5;
const MAX_SCAN_FOLDERS = 600;

function doGet(e) {
  var callback = String((e.parameter || {}).callback || '');
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
  }
  var response;
  try {
    var action = String((e.parameter || {}).action || 'semesters');
    if (action === 'semesters') response = { semesters: findSemesterFolders_() };
    else if (action === 'list') response = { items: listFolder_(String(e.parameter.folderId || ''), e.parameter.path) };
    else response = { error: 'Unknown action.' };
  } catch (err) {
    response = { error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(response) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function findSemesterFolders_() {
  var out = { 'S1 & S2':[], S3:[], S4:[], S5:[], S6:[], S7:[], S8:[] };
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var queue = [{folder:root, path:root.getName(), depth:0}];
  var seen = 0;
  while (queue.length && seen < MAX_SCAN_FOLDERS) {
    var node = queue.shift();
    seen++;
    var name = node.folder.getName();
    var key = semesterKey_(name);
    if (node.depth > 0 && key) {
      out[key].push({id:node.folder.getId(), name:name, type:'folder', path:node.path, url:node.folder.getUrl()});
      // Do not search within a semester folder for more semester folders.
      continue;
    }
    if (node.depth >= MAX_SCAN_DEPTH) continue;
    var folders = node.folder.getFolders();
    while (folders.hasNext()) {
      var folder = folders.next();
      queue.push({folder:folder,path:node.path+' / '+folder.getName(),depth:node.depth+1});
    }
  }
  Object.keys(out).forEach(function(key) {
    out[key].sort(function(a,b){return a.path.localeCompare(b.path);});
  });
  return out;
}

function semesterKey_(name) {
  var normalized = String(name).toUpperCase().replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
  if (/\bS\s*1\s*(?:&|AND|\+|,|\/)\s*S?\s*2\b/.test(normalized) ||
      /\bSEM(?:ESTER)?\s*1\s*(?:&|AND|\+|,|\/)\s*(?:SEM(?:ESTER)?\s*)?2\b/.test(normalized) ||
      /\bFIRST\s*YEAR\b/.test(normalized)) return 'S1 & S2';
  var match = normalized.match(/(?:^|\b)(?:S|SEM|SEMESTER)\s*([3-8])(?:\b|$)/);
  return match ? 'S' + match[1] : null;
}

function listFolder_(folderId, path) {
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(folderId)) throw new Error('Invalid folder ID.');
  var folder = path ? folderAtPath_(folderId, path) : DriveApp.getFolderById(folderId);
  if (!path && !withinRoot_(folder)) throw new Error('This folder is outside the configured Drive root.');
  var items = [];
  var folders = folder.getFolders();
  while (folders.hasNext()) {
    var child = folders.next();
    items.push({ id:child.getId(), type:'folder', name:child.getName(), url:child.getUrl() });
  }
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var mimeType = file.getMimeType();
    items.push({
      id:file.getId(), type:'file', name:file.getName(), mimeType:mimeType,
      size:file.getSize(), url:file.getUrl(),
      // Downloads are provided only for ordinary binary files. Browser access
      // still depends on the viewer's Google Drive sharing permissions.
      downloadUrl: mimeType.indexOf('application/vnd.google-apps.') === 0 ? null :
        'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(file.getId())
    });
  }
  items.sort(function(a,b) {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
  });
  return items;
}

// Restrict public read-only API to a single configured tree.
function withinRoot_(folder) {
  if (folder.getId() === ROOT_FOLDER_ID) return true;
  var candidates = [folder];
  for (var depth = 0; depth < 30 && candidates.length; depth++) {
    var parentsToCheck = [];
    for (var i=0; i<candidates.length; i++) {
      var parents = candidates[i].getParents();
      while (parents.hasNext()) {
        var parent = parents.next();
        if (parent.getId() === ROOT_FOLDER_ID) return true;
        parentsToCheck.push(parent);
      }
    }
    candidates = parentsToCheck;
  }
  return false;
}

// Verify each selected child from the root using the same listings visitors browse.
function folderAtPath_(folderId, path) {
  var ids = String(path).split('/');
  if (ids.length > 30 || ids[ids.length - 1] !== folderId) throw new Error('Invalid folder path.');
  var folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  for (var i = 0; i < ids.length; i++) {
    var children = folder.getFolders();
    var found = null;
    while (children.hasNext()) {
      var child = children.next();
      if (child.getId() === ids[i]) { found = child; break; }
    }
    if (!found) throw new Error('This folder is no longer listed here. Refresh Drive and reopen it.');
    folder = found;
  }
  return folder;
}
