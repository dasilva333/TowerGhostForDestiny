window.ua = navigator.userAgent;
window.isNWJS = (typeof require != "undefined");
window.isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor) && typeof chrome != "undefined";
window.isFirefox = (/firefox/i.test(ua));
window.isIOS = (/ios|iphone|ipod|ipad/i.test(ua));
window.isiPad = (/ipad/i.test(ua));
window.isAndroid = (/android/i.test(ua));
window.isWindowsPhone = (/iemobile/i.test(ua));
window.isMobile = (window.isIOS || window.isAndroid || window.isWindowsPhone);
window.isKindle = /Kindle/i.test(ua) || /Silk/i.test(ua) || /KFTT/i.test(ua) || /KFOT/i.test(ua) || /KFJWA/i.test(ua) || /KFJWI/i.test(ua) || /KFSOWI/i.test(ua) || /KFTHWA/i.test(ua) || /KFTHWI/i.test(ua) || /KFAPWA/i.test(ua) || /KFAPWI/i.test(ua);
window.isStaticBrowser = location.protocol.indexOf("http") > -1 && location.href.indexOf("towerghostfordestiny.com/firefox") == -1;
if (window.isStaticBrowser) {
    window.isMobile = window.isWindowsPhone = window.isAndroid = window.isIOS = window.isFirefox = window.isChrome = window.isNWJS = false;
}
window.tgd = {};
tgd.dataDir = "data";
if (isWindowsPhone) {
    window.requestFileSystem = function() {};
}
tgd.localLogging = location.href.indexOf("debug") > -1;
tgd.localLog = function(msg) {
    if (tgd.localLogging) {
        console.log(msg);
    }
};
if (isFirefox) {
    window.ffRequestId = 0;
    window.ffXHRisReady = false;

    window.addEventListener("cs-ready", function(event) {
        window.ffXHRisReady = true;
        tgd.dataDir = event.data.localPath + 'data';
    }, false);

    var ffXHR = function() {
        tgd.localLog("creating new ff obj");

        var self = this;

        this.readyState = 1;
        this.status = 500;
        this.statusText = "";
        this.request = {};
        this.id = window.ffRequestId++;
        this.withCredentials = true;

        this.open = function(type, url, async, username, password) {
            tgd.localLog("opening a new request");
            self.request = {
                id: self.id,
                type: type,
                url: url,
                async: async,
                username: username,
                password: password,
                headers: []
            };
        };
        this.abort = function() {

        };
        this.setRequestHeader = function(key, value) {
            self.request.headers.push({
                key: key,
                value: value
            });
        };
        this.getAllResponseHeaders = function() {
            return "";
        };
        this.send = function(payload) {
            var send = function() {
                if (payload)
                    self.request.payload = payload;
                var event = document.createEvent('CustomEvent');
                event.initCustomEvent("xhr-request", true, true, self.request);
                document.documentElement.dispatchEvent(event);
                tgd.localLog("send request to " + self.request.url);
            }
            if (window.ffXHRisReady == true) {
                send();
            } else {
                var check = setInterval(function() {
                    if (window.ffXHRisReady == true) {
                        clearInterval(check);
                        send();
                    }
                }, 1000);
            }
        };
        this.onreadystatechange = function() {
            //console.log("state changed");
        };
        window.addEventListener("xhr-reply", function(event) {
            tgd.localLog("xhr-reply! " + self.request.url);
            var xhr = event.detail;
            if (xhr.id == self.id) {
                self.readyState = xhr.readyState;
                self.status = xhr.status;
                self.statusText = xhr.statusText;
                self.responseText = xhr.responseText;
                self.onreadystatechange();
            }
        }, false);
        return self;
    };

    window.XMLHttpRequest = function() {
        return new ffXHR();
    };;
    tgd.localLog("init firefox xhr");
}
/** 
 * Copyright 2013 - Eric Bidelman
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 
 * @fileoverview
 * A polyfill implementation of the HTML5 Filesystem API which sits on top of
 * IndexedDB as storage layer. Files and folders are stored as FileEntry and
 * FolderEntry objects in a single object store. IDBKeyRanges are used to query
 * into a folder. A single object store is sufficient because we can utilize the
 * properties of ASCII. Namely, ASCII / is followed by ASCII 0. Thus,
 * "/one/two/" comes before "/one/two/ANYTHING" comes before "/one/two/0".
 *
 * @author Eric Bidelman (ebidel@gmail.com)
 * @version: 0.0.5
 */

'use strict';

(function(exports) {

// Bomb out if the Filesystem API is available natively.
if (exports.requestFileSystem || exports.webkitRequestFileSystem) {
  return;
}

// Bomb out if no indexedDB available
var indexedDB = exports.indexedDB || exports.mozIndexedDB ||
                exports.msIndexedDB;
if (!indexedDB) {
  return;
}

// Check to see if IndexedDB support blobs
var support = new function() {
  var dbName = "blob-support";
  indexedDB.deleteDatabase(dbName).onsuccess = function() {
    var request = indexedDB.open(dbName, 1.0);
    request.onerror = function() {
      support.blob = false;
    };
    request.onsuccess = function() {
      var db = request.result;
      try {
        var blob = new Blob(["test"], {type: "text/plain"});
        var transaction = db.transaction("store", "readwrite");
        transaction.objectStore("store").put(blob, "key");
        support.blob = true;
      } catch (err) {
        support.blob = false;
      } finally {
        db.close();
        indexedDB.deleteDatabase(dbName);
      }
    };
    request.onupgradeneeded = function() {
      request.result.createObjectStore("store");
    };
  };
};

var Base64ToBlob = function(dataURL) {
  var BASE64_MARKER = ';base64,';
  if (dataURL.indexOf(BASE64_MARKER) == -1) {
    var parts = dataURL.split(',');
    var contentType = parts[0].split(':')[1];
    var raw = decodeURIComponent(parts[1]);

    return new Blob([raw], {type: contentType});
  }

  var parts = dataURL.split(BASE64_MARKER);
  var contentType = parts[0].split(':')[1];
  var raw = window.atob(parts[1]);
  var rawLength = raw.length;

  var uInt8Array = new Uint8Array(rawLength);

  for (var i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], {type: contentType});
};

var BlobToBase64 = function(blob, onload) {
  var reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = function() {
    onload(reader.result);
  };
};

if (!exports.PERSISTENT) {
  exports.TEMPORARY = 0;
  exports.PERSISTENT = 1;
}

// Prevent errors in browsers that don't support FileError.
// TODO: FF 13+ supports DOM4 Events (DOMError). Use them instead?
if (exports.FileError === undefined) {
  window.FileError = function() {};
  FileError.prototype.prototype = Error.prototype;
}

if (!FileError.INVALID_MODIFICATION_ERR) {
  FileError.INVALID_MODIFICATION_ERR = 9;
  FileError.NOT_FOUND_ERR  = 1;
}

function MyFileError(obj) {
  var code_ = obj.code;
  var name_ = obj.name;

    // Required for FF 11.
  Object.defineProperty(this, 'code', {
    set: function(code) {
      code_ = code;
    },
    get: function() {
      return code_;
    }
  });

  Object.defineProperty(this, 'name', {
    set: function(name) {
      name_ = name;
    },
    get: function() {
      return name_;
    }
  });
}
MyFileError.prototype = FileError.prototype;
MyFileError.prototype.toString = Error.prototype.toString;

var INVALID_MODIFICATION_ERR = new MyFileError({
      code: FileError.INVALID_MODIFICATION_ERR,
      name: 'INVALID_MODIFICATION_ERR'});
var NOT_IMPLEMENTED_ERR = new MyFileError({code: 1000,
                                           name: 'Not implemented'});
var NOT_FOUND_ERR = new MyFileError({code: FileError.NOT_FOUND_ERR,
                                     name: 'Not found'});

var fs_ = null;

// Browsers other than Chrome don't implement persistent vs. temporary storage.
// but default to temporary anyway.
var storageType_ = 'temporary';
var idb_ = {};
idb_.db = null;
var FILE_STORE_ = 'entries';

var DIR_SEPARATOR = '/';
var DIR_OPEN_BOUND = String.fromCharCode(DIR_SEPARATOR.charCodeAt(0) + 1);

// When saving an entry, the fullPath should always lead with a slash and never
// end with one (e.g. a directory). Also, resolve '.' and '..' to an absolute
// one. This method ensures path is legit!
function resolveToFullPath_(cwdFullPath, path) {
  var fullPath = path;

  var relativePath = path[0] != DIR_SEPARATOR;
  if (relativePath) {
    fullPath = cwdFullPath + DIR_SEPARATOR + path;
  }

  // Normalize '.'s,  '..'s and '//'s.
  var parts = fullPath.split(DIR_SEPARATOR);
  var finalParts = [];
  for (var i = 0; i < parts.length; ++i) {
    var part = parts[i];
    if (part === '..') {
      // Go up one level.
      if (!finalParts.length) {
        throw Error('Invalid path');
      }
      finalParts.pop();
    } else if (part === '.') {
      // Skip over the current directory.
    } else if (part !== '') {
      // Eliminate sequences of '/'s as well as possible leading/trailing '/'s. 
      finalParts.push(part);
    }
  }

  fullPath = DIR_SEPARATOR + finalParts.join(DIR_SEPARATOR);

  // fullPath is guaranteed to be normalized by construction at this point:
  // '.'s, '..'s, '//'s will never appear in it.

  return fullPath;
}

// // Path can be relative or absolute. If relative, it's taken from the cwd_.
// // If a filesystem URL is passed it, it is simple returned
// function pathToFsURL_(path) {
//   path = resolveToFullPath_(cwdFullPath, path);
//   path = fs_.root.toURL() + path.substring(1);
//   return path;
// };

/**
 * Interface to wrap the native File interface.
 *
 * This interface is necessary for creating zero-length (empty) files,
 * something the Filesystem API allows you to do. Unfortunately, File's
 * constructor cannot be called directly, making it impossible to instantiate
 * an empty File in JS.
 *
 * @param {Object} opts Initial values.
 * @constructor
 */
function MyFile(opts) {
  var blob_ = null;

  this.size = opts.size || 0;
  this.name = opts.name || '';
  this.type = opts.type || '';
  this.lastModifiedDate = opts.lastModifiedDate || null;
  //this.slice = Blob.prototype.slice; // Doesn't work with structured clones.

  // Need some black magic to correct the object's size/name/type based on the
  // blob that is saved.
  Object.defineProperty(this, 'blob_', {
    enumerable: true,
    get: function() {
      return blob_;
    },
    set: function (val) {
      blob_ = val;
      this.size = blob_.size;
      this.name = blob_.name;
      this.type = blob_.type;
      this.lastModifiedDate = blob_.lastModifiedDate;
    }.bind(this)
  });
}
MyFile.prototype.constructor = MyFile; 
//MyFile.prototype.slice = Blob.prototype.slice;

/**
 * Interface to writing a Blob/File.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/file-writer.html#the-filewriter-interface
 *
 * @param {FileEntry} fileEntry The FileEntry associated with this writer.
 * @constructor
 */
function FileWriter(fileEntry) {
  if (!fileEntry) {
    throw Error('Expected fileEntry argument to write.');
  }

  var position_ = 0;
  var blob_ = fileEntry.file_ ? fileEntry.file_.blob_ : null;

  Object.defineProperty(this, 'position', {
    get: function() {
      return position_;
    }
  });

  Object.defineProperty(this, 'length', {
    get: function() {
      return blob_ ? blob_.size : 0;
    }
  });

  this.seek = function(offset) {
    position_ = offset;

    if (position_ > this.length) {
      position_ = this.length;
    }
    if (position_ < 0) {
      position_ += this.length;
    }
    if (position_ < 0) {
      position_ = 0;
    }
  };

  this.truncate = function(size) {
    if (blob_) {
      if (size < this.length) {
        blob_ = blob_.slice(0, size);
      } else {
        blob_ = new Blob([blob_, new Uint8Array(size - this.length)],
                         {type: blob_.type});
      }
    } else {
      blob_ = new Blob([]);
    }

    position_ = 0; // truncate from beginning of file.

    this.write(blob_); // calls onwritestart and onwriteend.
  };

  this.write = function(data) {
    if (!data) {
      throw Error('Expected blob argument to write.');
    }

    // Call onwritestart if it was defined.
    if (this.onwritestart) {
      this.onwritestart();
    }

    // TODO: not handling onprogress, onwrite, onabort. Throw an error if
    // they're defined.

    if (blob_) {
      // Calc the head and tail fragments
      var head = blob_.slice(0, position_);
      var tail = blob_.slice(position_ + data.size);

      // Calc the padding
      var padding = position_ - head.size;
      if (padding < 0) {
        padding = 0;
      }

      // Do the "write". In fact, a full overwrite of the Blob.
      // TODO: figure out if data.type should overwrite the exist blob's type.
      blob_ = new Blob([head, new Uint8Array(padding), data, tail],
                       {type: blob_.type});
    } else {
      blob_ = new Blob([data], {type: data.type});
    }

    var writeFile = function(blob) {
      // Blob might be a DataURI depending on browser support.
      fileEntry.file_.blob_ = blob;
      fileEntry.file_.lastModifiedDate = data.lastModifiedDate || new Date();
      idb_.put(fileEntry, function(entry) {
        if (!support.blob) {
		  // Set the blob we're writing on this file entry so we can recall it later.
		  fileEntry.file_.blob_ = blob_;
		  fileEntry.file_.lastModifiedDate = data.lastModifiedDate || null;
		}

        // Add size of data written to writer.position.
        position_ += data.size;

        if (this.onwriteend) {
          this.onwriteend();
        }
      }.bind(this), this.onerror);
    }.bind(this);

    if (support.blob) {
      writeFile(blob_);
    } else {
      BlobToBase64(blob_, writeFile);
    }
  };
}


/**
 * Interface for listing a directory's contents (files and folders).
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-DirectoryReader
 *
 * @constructor
 */
function DirectoryReader(dirEntry) {
  var dirEntry_ = dirEntry;
  var used_ = false;

  this.readEntries = function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }

    // This is necessary to mimic the way DirectoryReader.readEntries() should
    // normally behavior.  According to spec, readEntries() needs to be called
    // until the length of result array is 0. To handle someone implementing
    // a recursive call to readEntries(), get everything from indexedDB on the
    // first shot. Then (DirectoryReader has been used), return an empty
    // result array.
    if (!used_) {
      idb_.getAllEntries(dirEntry_.fullPath, function(entries) {
        used_= true;
        successCallback(entries);
      }, opt_errorCallback);
    } else {
      successCallback([]);
    }
  };
};

/**
 * Interface supplies information about the state of a file or directory. 
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/file-dir-sys.html#idl-def-Metadata
 *
 * @constructor
 */
function Metadata(modificationTime, size) {
  this.modificationTime_ = modificationTime || null;
  this.size_ = size || 0;
}

Metadata.prototype = {
  get modificationTime() {
    return this.modificationTime_;
  },
  get size() {
    return this.size_;
  }
}

/**
 * Interface representing entries in a filesystem, each of which may be a File
 * or DirectoryEntry.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-Entry
 *
 * @constructor
 */
function Entry() {}

Entry.prototype = {
  name: null,
  fullPath: null,
  filesystem: null,
  copyTo: function() {
    throw NOT_IMPLEMENTED_ERR;
  },
  getMetadata: function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }

    try {
      if (this.isFile) {
        successCallback(
            new Metadata(this.file_.lastModifiedDate, this.file_.size));
      } else {
        opt_errorCallback(new MyFileError({code: 1001,
            name: 'getMetadata() not implemented for DirectoryEntry'}));
      }
    } catch(e) {
      opt_errorCallback && opt_errorCallback(e);
    }
  },
  getParent: function() {
    throw NOT_IMPLEMENTED_ERR;
  },
  moveTo: function() {
    throw NOT_IMPLEMENTED_ERR;
  },
  remove: function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }
    // TODO: This doesn't protect against directories that have content in it.
    // Should throw an error instead if the dirEntry is not empty.
    idb_['delete'](this.fullPath, function() {
      successCallback();
    }, opt_errorCallback);
  },
  toURL: function() {
    var origin = location.protocol + '//' + location.host;
    return 'filesystem:' + origin + DIR_SEPARATOR + storageType_.toLowerCase() +
           this.fullPath;
  },
};

/**
 * Interface representing a file in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-fileentry-interface
 *
 * @param {FileEntry} opt_fileEntry Optional FileEntry to initialize this 
 *     object from.
 * @constructor
 * @extends {Entry}
 */
function FileEntry(opt_fileEntry) {
  this.file_ = null;

  Object.defineProperty(this, 'isFile', {
    enumerable: true,
    get: function() {
      return true;
    }
  });
  Object.defineProperty(this, 'isDirectory', {
    enumerable: true,
    get: function() {
      return false;
    }
  });

  // Create this entry from properties from an existing FileEntry.
  if (opt_fileEntry) {
    this.file_ = opt_fileEntry.file_;
    this.name = opt_fileEntry.name;
    this.fullPath = opt_fileEntry.fullPath;
    this.filesystem = opt_fileEntry.filesystem;
    if (typeof(this.file_.blob_) === "string") {
      this.file_.blob_ = Base64ToBlob(this.file_.blob_);
    }
  }
}
FileEntry.prototype = new Entry();
FileEntry.prototype.constructor = FileEntry;
FileEntry.prototype.createWriter = function(callback) {
  // TODO: figure out if there's a way to dispatch onwrite event as we're writing
  // data to IDB. Right now, we're only calling onwritend/onerror
  // FileEntry.write().
  callback(new FileWriter(this));
};
FileEntry.prototype.file = function(successCallback, opt_errorCallback) {
  if (!successCallback) {
    throw Error('Expected successCallback argument.');
  }

  if (this.file_ == null) {
    if (opt_errorCallback) {
      opt_errorCallback(NOT_FOUND_ERR);
    } else {
      throw NOT_FOUND_ERR;
    }
    return;
  }

  // If we're returning a zero-length (empty) file, return the fake file obj.
  // Otherwise, return the native File object that we've stashed.
  var file = this.file_.blob_ == null ? this.file_ : this.file_.blob_;
  file.lastModifiedDate = this.file_.lastModifiedDate;

  // Add Blob.slice() to this wrapped object. Currently won't work :(
  /*if (!val.slice) {
    val.slice = Blob.prototype.slice; // Hack to add back in .slice().
  }*/
  successCallback(file);
};

/**
 * Interface representing a directory in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-directoryentry-interface
 *
 * @param {DirectoryEntry} opt_folderEntry Optional DirectoryEntry to
 *     initialize this object from.
 * @constructor
 * @extends {Entry}
 */
function DirectoryEntry(opt_folderEntry) {
  Object.defineProperty(this, 'isFile', {
    enumerable: true,
    get: function() {
      return false;
    }
  });
  Object.defineProperty(this, 'isDirectory', {
    enumerable: true,
    get: function() {
      return true;
    }
  });

  // Create this entry from properties from an existing DirectoryEntry.
  if (opt_folderEntry) {
    this.name = opt_folderEntry.name;
    this.fullPath = opt_folderEntry.fullPath;
    this.filesystem = opt_folderEntry.filesystem;
  }
}
DirectoryEntry.prototype = new Entry();
DirectoryEntry.prototype.constructor = DirectoryEntry; 
DirectoryEntry.prototype.createReader = function() {
  return new DirectoryReader(this);
};
DirectoryEntry.prototype.getDirectory = function(path, options, successCallback,
                                                 opt_errorCallback) {

  // Create an absolute path if we were handed a relative one.
  path = resolveToFullPath_(this.fullPath, path);

  idb_.get(path, function(folderEntry) {
    if (!options) {
      options = {};
    }

    if (options.create === true && options.exclusive === true && folderEntry) {
      // If create and exclusive are both true, and the path already exists,
      // getDirectory must fail.
      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }
    } else if (options.create === true && !folderEntry) {
      // If create is true, the path doesn't exist, and no other error occurs,
      // getDirectory must create it as a zero-length file and return a corresponding
      // DirectoryEntry.
      var dirEntry = new DirectoryEntry();
      dirEntry.name = path.split(DIR_SEPARATOR).pop(); // Just need filename.
      dirEntry.fullPath = path;
      dirEntry.filesystem = fs_;
  
      idb_.put(dirEntry, successCallback, opt_errorCallback);
    } else if (options.create === true && folderEntry) {

      if (folderEntry.isDirectory) {
        // IDB won't save methods, so we need re-create the DirectoryEntry.
        successCallback(new DirectoryEntry(folderEntry));
      } else {
        if (opt_errorCallback) {
          opt_errorCallback(INVALID_MODIFICATION_ERR);
          return;
        }
      }
    } else if ((!options.create || options.create === false) && !folderEntry) {
      // Handle root special. It should always exist.
      if (path == DIR_SEPARATOR) {
        folderEntry = new DirectoryEntry();
        folderEntry.name = '';
        folderEntry.fullPath = DIR_SEPARATOR;
        folderEntry.filesystem = fs_;
        successCallback(folderEntry);
        return;
      }

      // If create is not true and the path doesn't exist, getDirectory must fail.
      if (opt_errorCallback) {
        opt_errorCallback(NOT_FOUND_ERR);
        return;
      }
    } else if ((!options.create || options.create === false) && folderEntry &&
               folderEntry.isFile) {
      // If create is not true and the path exists, but is a file, getDirectory
      // must fail.
      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }
    } else {
      // Otherwise, if no other error occurs, getDirectory must return a
      // DirectoryEntry corresponding to path.

      // IDB won't' save methods, so we need re-create DirectoryEntry.
      successCallback(new DirectoryEntry(folderEntry));
    } 
  }, opt_errorCallback);
};

DirectoryEntry.prototype.getFile = function(path, options, successCallback,
                                            opt_errorCallback) {

  // Create an absolute path if we were handed a relative one.
  path = resolveToFullPath_(this.fullPath, path);

  idb_.get(path, function(fileEntry) {
    if (!options) {
      options = {};
    }

    if (options.create === true && options.exclusive === true && fileEntry) {
      // If create and exclusive are both true, and the path already exists,
      // getFile must fail.

      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }
    } else if (options.create === true && !fileEntry) {
      // If create is true, the path doesn't exist, and no other error occurs,
      // getFile must create it as a zero-length file and return a corresponding
      // FileEntry.
      var fileEntry = new FileEntry();
      fileEntry.name = path.split(DIR_SEPARATOR).pop(); // Just need filename.
      fileEntry.fullPath = path;
      fileEntry.filesystem = fs_;
      fileEntry.file_ = new MyFile({size: 0, name: fileEntry.name,
                                    lastModifiedDate: new Date()});

      idb_.put(fileEntry, successCallback, opt_errorCallback);

    } else if (options.create === true && fileEntry) {
      if (fileEntry.isFile) {
        // IDB won't save methods, so we need re-create the FileEntry.
        successCallback(new FileEntry(fileEntry));
      } else {
        if (opt_errorCallback) {
          opt_errorCallback(INVALID_MODIFICATION_ERR);
          return;
        }
      }
    } else if ((!options.create || options.create === false) && !fileEntry) {
      // If create is not true and the path doesn't exist, getFile must fail.
      if (opt_errorCallback) {
        opt_errorCallback(NOT_FOUND_ERR);
        return;
      }
    } else if ((!options.create || options.create === false) && fileEntry &&
               fileEntry.isDirectory) {
      // If create is not true and the path exists, but is a directory, getFile
      // must fail.
      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }
    } else {
      // Otherwise, if no other error occurs, getFile must return a FileEntry
      // corresponding to path.

      // IDB won't' save methods, so we need re-create the FileEntry.
      successCallback(new FileEntry(fileEntry));
    } 
  }, opt_errorCallback);
};

DirectoryEntry.prototype.removeRecursively = function(successCallback,
                                                      opt_errorCallback) {
  if (!successCallback) {
    throw Error('Expected successCallback argument.');
  }

  this.remove(successCallback, opt_errorCallback);
};

/**
 * Interface representing a filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-LocalFileSystem
 *
 * @param {number} type Kind of storage to use, either TEMPORARY or PERSISTENT.
 * @param {number} size Storage space (bytes) the application expects to need.
 * @constructor
 */
function DOMFileSystem(type, size) {
  storageType_ = type == exports.TEMPORARY ? 'Temporary' : 'Persistent';
  this.name = (location.protocol + location.host).replace(/:/g, '_') +
              ':' + storageType_;
  this.root = new DirectoryEntry();
  this.root.fullPath = DIR_SEPARATOR;
  this.root.filesystem = this;
  this.root.name = '';
}

function requestFileSystem(type, size, successCallback, opt_errorCallback) {
  if (type != exports.TEMPORARY && type != exports.PERSISTENT) {
    if (opt_errorCallback) {
      opt_errorCallback(INVALID_MODIFICATION_ERR);
      return;
    }
  }

  fs_ = new DOMFileSystem(type, size);
  idb_.open(fs_.name, function(e) {
    successCallback(fs_);
  }, opt_errorCallback);
}

function resolveLocalFileSystemURL(url, successCallback, opt_errorCallback) {
  var origin = location.protocol + '//' + location.host;
  var base = 'filesystem:' + origin + DIR_SEPARATOR + storageType_.toLowerCase();
  url = url.replace(base, '');
  if (url.substr(-1) === '/') {
    url = url.slice(0, -1);
  }
  if (url) {
    idb_.get(url, function(entry) {
      if (entry) {
        if (entry.isFile) {
          return successCallback(new FileEntry(entry));
        } else if (entry.isDirectory) {
          return successCallback(new DirectoryEntry(entry));
        }
      } else {
        opt_errorCallback && opt_errorCallback(NOT_FOUND_ERR);
      }
    }, opt_errorCallback);
  } else {
    successCallback(fs_.root);
  }
}

// Core logic to handle IDB operations =========================================

idb_.open = function(dbName, successCallback, opt_errorCallback) {
  var self = this;

  // TODO: FF 12.0a1 isn't liking a db name with : in it.
  var request = indexedDB.open(dbName.replace(':', '_')/*, 1 /*version*/);

  request.onerror = opt_errorCallback || onError;

  request.onupgradeneeded = function(e) {
    // First open was called or higher db version was used.

   // console.log('onupgradeneeded: oldVersion:' + e.oldVersion,
   //           'newVersion:' + e.newVersion);
    
    self.db = e.target.result;
    self.db.onerror = onError;

    if (!self.db.objectStoreNames.contains(FILE_STORE_)) {
      var store = self.db.createObjectStore(FILE_STORE_/*,{keyPath: 'id', autoIncrement: true}*/);
    }
  };

  request.onsuccess = function(e) {
    self.db = e.target.result;
    self.db.onerror = onError;
    successCallback(e);
  };
 
  request.onblocked = opt_errorCallback || onError;
};

idb_.close = function() {
  this.db.close();
  this.db = null;
};

// TODO: figure out if we should ever call this method. The filesystem API
// doesn't allow you to delete a filesystem once it is 'created'. Users should
// use the public remove/removeRecursively API instead.
idb_.drop = function(successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var dbName = this.db.name;

  var request = indexedDB.deleteDatabase(dbName);
  request.onsuccess = function(e) {
    successCallback(e);
  };
  request.onerror = opt_errorCallback || onError;

  idb_.close();
};

idb_.get = function(fullPath, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE_], 'readonly');

  //var request = tx.objectStore(FILE_STORE_).get(fullPath);
  var range = IDBKeyRange.bound(fullPath, fullPath + DIR_OPEN_BOUND,
                                false, true);
  var request = tx.objectStore(FILE_STORE_).get(range);

  tx.onabort = opt_errorCallback || onError;
  tx.oncomplete = function(e) {
    successCallback(request.result);
  };
};

idb_.getAllEntries = function(fullPath, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var results = [];

  //var range = IDBKeyRange.lowerBound(fullPath, true);
  //var range = IDBKeyRange.upperBound(fullPath, true);

  // Treat the root entry special. Querying it returns all entries because
  // they match '/'.
  var range = null;
  if (fullPath != DIR_SEPARATOR) {
    //console.log(fullPath + '/', fullPath + DIR_OPEN_BOUND)
    range = IDBKeyRange.bound(
        fullPath + DIR_SEPARATOR, fullPath + DIR_OPEN_BOUND, false, true);
  }

  var tx = this.db.transaction([FILE_STORE_], 'readonly');
  tx.onabort = opt_errorCallback || onError;
  tx.oncomplete = function(e) {
    // TODO: figure out how to do be range queries instead of filtering result
    // in memory :(
    results = results.filter(function(val) {
      var valPartsLen = val.fullPath.split(DIR_SEPARATOR).length;
      var fullPathPartsLen = fullPath.split(DIR_SEPARATOR).length;
      
      if (fullPath == DIR_SEPARATOR && valPartsLen < fullPathPartsLen + 1) {
        // Hack to filter out entries in the root folder. This is inefficient
        // because reading the entires of fs.root (e.g. '/') returns ALL
        // results in the database, then filters out the entries not in '/'.
        return val;
      } else if (fullPath != DIR_SEPARATOR &&
                 valPartsLen == fullPathPartsLen + 1) {
        // If this a subfolder and entry is a direct child, include it in
        // the results. Otherwise, it's not an entry of this folder.
        return val;
      }
    });

    successCallback(results);
  };

  var request = tx.objectStore(FILE_STORE_).openCursor(range);

  request.onsuccess = function(e) {
    var cursor = e.target.result;
    if (cursor) {
      var val = cursor.value;

      results.push(val.isFile ? new FileEntry(val) : new DirectoryEntry(val));
      cursor['continue']();
    }
  };
};

idb_['delete'] = function(fullPath, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE_], 'readwrite');
  tx.oncomplete = successCallback;
  tx.onabort = opt_errorCallback || onError;

  //var request = tx.objectStore(FILE_STORE_).delete(fullPath);
  var range = IDBKeyRange.bound(
      fullPath, fullPath + DIR_OPEN_BOUND, false, true);
  var request = tx.objectStore(FILE_STORE_)['delete'](range);
};

idb_.put = function(entry, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE_], 'readwrite');
  tx.onabort = opt_errorCallback || onError;
  tx.oncomplete = function(e) {
    // TODO: Error is thrown if we pass the request event back instead.
    successCallback(entry);
  };

  var request = tx.objectStore(FILE_STORE_).put(entry, entry.fullPath);
};

// Global error handler. Errors bubble from request, to transaction, to db.
function onError(e) {
  switch (e.target.errorCode) {
    case 12:
      console.log('Error - Attempt to open db with a lower version than the ' +
                  'current one.');
      break;
    default:
      console.log('errorCode: ' + e.target.errorCode);
  }

  console.log(e, e.code, e.message);
}

// Clean up.
// TODO: decide if this is the best place for this. 
exports.addEventListener('beforeunload', function(e) {
  idb_.db && idb_.db.close();
}, false);

//exports.idb = idb_;
exports.requestFileSystem = requestFileSystem;
exports.resolveLocalFileSystemURL = resolveLocalFileSystemURL;

// Export more stuff (to window) for unit tests to do their thing.
if (exports === window && exports.RUNNING_TESTS) {
  exports['Entry'] = Entry;
  exports['FileEntry'] = FileEntry;
  exports['DirectoryEntry'] = DirectoryEntry;
  exports['resolveToFullPath_'] = resolveToFullPath_;
  exports['Metadata'] = Metadata;
  exports['Base64ToBlob'] = Base64ToBlob;
}

})(self); // Don't use window because we want to run in workers.

(function() {
    // Retrieved and slightly modified from: https://github.com/typicode/pegasus
    // --------------------------------------------------------------------------
    //
    // a   url (naming it a, beacause it will be reused to store callbacks)
    // xhr placeholder to avoid using var, not to be used
    window.pegasus = function pegasus(a, xhr) {
        xhr = new XMLHttpRequest();

        // Open url
        xhr.open('GET', a);

        // Reuse a to store callbacks
        a = [];

        // onSuccess handler
        // onError   handler
        // cb        placeholder to avoid using var, should not be used
        xhr.onreadystatechange = xhr.then = function(onSuccess, onError, cb) {

            // Test if onSuccess is a function or a load event
            if (onSuccess && onSuccess.call) a = [onSuccess, onError];

            // Test if request is complete
            if (xhr.readyState == 4) {

                // index will be:
                // 0 if status is between 0 and 399
                // 1 if status is over
                cb = a[0 | xhr.status / 400];

                // Safari doesn't support xhr.responseType = 'json'
                // so the response is parsed
                if (cb) {
                    var response;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch (e) {
                        console.log(e);
                    }
                    var result = ((xhr.status === 200 || xhr.status === 0) && xhr.responseText !== "") ? response : xhr;
                    cb(result);
                }
            }
        };

        // Send
        xhr.send();

        // Return request
        return xhr;
    };
    //------------------------------------------------------------------
    // Step 2: After fetching manifest (localStorage or XHR), load it
    function loadManifest(manifest, fromLocalStorage, timeout) {
        // Safety timeout. If BOOTSTRAP_OK is not defined,
        // it will delete the 'localStorage' version and revert to factory settings.
        if (fromLocalStorage) {
            setTimeout(function() {
                if (!window.BOOTSTRAP_OK) {
                    console.warn('BOOTSTRAP_OK !== true; Resetting to original manifest.json...');
                    localStorage.removeItem('manifest');
                    location.reload();
                }
            }, timeout);
        }

        if (!manifest.load) {
            console.error('Manifest has nothing to load (manifest.load is empty).', manifest);
            return;
        }

        manifest.root = manifest.root || './';

        var el,
            loadAsScript = (isFirefox == true && manifest.root == './') || !isFirefox,
            head = document.getElementsByTagName('head')[0],
            scripts = manifest.load.concat(),
            now = Date.now(),
            loading = [],
            count = 0;

        function loadNextFromFS(index) {
            if ((loading.length - 1) >= index) {
                var element = loading[index][0];
                var source = loading[index][1];
                window.__fs.root.getFile(source, {},
                    function(fileEntry) { //onSuccess
                        fileEntry.file(function(file) {
                            var reader = new FileReader();
                            reader.onloadend = function() {
                                //setTimeout(function() {
                                index++;
                                loadNextFromFS(index);
                                //}, 250);
                                element.innerHTML = this.result;
                                head.appendChild(element);
                            }
                            reader.readAsText(file);
                        });
                    },
                    function() {} //onError
                )
            }
        }

        // Load Scripts
        function loadScripts() {
            scripts.forEach(function(src) {
                if (!src) return;
                // Ensure the 'src' has no '/' (it's in the root already)
                if (src[0] === '/') src = src.substr(1);
                //Don't use the root manifest when loading from local storage for Firefox
                if (loadAsScript) {
                    src = manifest.root + src;
                } else {
                    src = "app/" + src;
                }
                // Load javascript
                if (src.substr(-5).indexOf(".js") > -1) {
                    el = document.createElement('script');
                    el.type = 'text/javascript';
                    el.async = false;
                    el.defer = true;
                    //TODO: Investigate if cache busting is nessecary for some platforms, apparently it does not work in IEMobile 10
                    if (loadAsScript) {
                        el.src = src;
                    } else {
                        loading.push([el, src]);
                    }
                    // Load CSS
                } else {
                    el = document.createElement(loadAsScript ? 'link' : 'style');
                    el.rel = "stylesheet";
                    if (loadAsScript) {
                        el.href = src;
                    } else {
                        loading.push([el, src]);
                    }
                    el.type = "text/css";
                }
                head.appendChild(el);
            });
            if (!loadAsScript) {
                loadNextFromFS(count);
            }
        }

        //---------------------------------------------------
        // Step 3: Ensure the 'root' end with a '/'
        if (manifest.root.length > 0 && manifest.root[manifest.root.length - 1] !== '/')
            manifest.root += '/';

        // Step 4: Save manifest for next time
        if (!fromLocalStorage)
            localStorage.setItem('manifest', JSON.stringify(manifest));

        // Step 5: Load Scripts
        // If we're loading Cordova files, make sure Cordova is ready first!
        if (typeof window.cordova !== 'undefined') {
            document.addEventListener("deviceready", loadScripts, false);
        } else {
            if (loadAsScript) {
                loadScripts();
            } else {
                window.requestFileSystem(1, 20 * 1024 * 1024, function(fs) {
                    window.__fs = fs;
                    loadScripts();
                }, function() {});
            }
        }
        // Save to global scope
        window.Manifest = manifest;
    }
    //---------------------------------------------------------------------
    window.Manifest = {};
    // Step 1: Load manifest from localStorage
    var manifest = JSON.parse(localStorage.getItem('manifest'));
    // grab manifest.json location from <script manifest="..."></script>
    var s = document.querySelector('script[manifest]');
    // Not in localStorage? Fetch it!
    // Modified the code to always fetch the manifest if loaded locally, this allows auto updates to remain off and still be able to use the new manifests
    if (!manifest || manifest && manifest.root && manifest.root == "./") {
        var noQueryString = location.href.indexOf("?") > -1 ? location.href.split("?")[0] : location.href;
        var url = noQueryString.replace(noQueryString.split("/")[noQueryString.split("/").length - 1], '') + ((s ? s.getAttribute('manifest') : null) || 'bootstrap.json') + '?now=' + (new Date()).getTime();
        // get manifest.json, then loadManifest.
        pegasus(url).then(loadManifest, function(xhr) {
            console.error('Could not download ' + url + ': ' + xhr.status);
        });
        // Manifest was in localStorage. Load it immediatly.
    } else {
        loadManifest(manifest, true, s.getAttribute('timeout') || 10000);
    }
})();
//# sourceMappingURL=bootstrap.js.map