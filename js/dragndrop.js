function DragNDropHandler(dropzone, opts) {
    var that = this;
    var error, idx;
    this.reset = function() {
        error = false;
        idx = 0;
    }
    dropzone.ondragover = function(evt) {
        evt.preventDefault();
        that.reset();
    }
    dropzone.ondrop = function(evt) {
        evt.preventDefault();
        $(dropzone).hide();
        that._scanItems(evt.dataTransfer.items, function(fileEntry) {
            fileEntry.file(function(file) {
                if (error) return;
                if (!opts.multiselector.addFile(file)) error = true;
                idx++;
                if (idx == 1) opts.multiselector.installUploadControls();
            });
        });
    }
    this._scanItems = function(arr, cb) {
        $(arr).each(function(_, item) {
            var entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : item;
            if (entry.isDirectory) {
                entry.createReader().readEntries(function(entries) {
                    that._scanItems(entries, cb);
                }, function(error) {
                    console.log("Error while reading directory:", error);
                });
            } else if (entry.isFile && cb) {
                cb(entry);
            }
        });
    }
}