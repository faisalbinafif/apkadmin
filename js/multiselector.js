function MultiSelector(target, file_input, opts) {
    var that = this;
    var inner_files = [];
    var accept = opts.ext_allowed ? '.' + opts.ext_allowed.split(/\|/).join(',.') : null;
    if (accept) $(file_input).attr('accept', accept);
    this.addFile = function(file) {
        var table = $('<table>');
        var row = $('<tr class="xrow"></tr>');
        var cell = $('<td>');
        var xfname = $('<font class="xfname">');
        var xfsize = $('<font class="xfsize">');
        var descr = $('<input type="text" class="fdescr" maxlength="48" name="file_descr">');
        var is_public = $('<input type="checkbox" value="1" name="file_public">');
        var is_public_label = $('<label class="xdescr">Public</label>');
        var del = $('<div class="remove-file"><i class="fas fa-times"></i></div>');
        $(xfname).html(file.name);
        $(xfsize).html('(' + convertSize(file.size) + ')');
        var idx = inner_files.length;
        var id = 'pub_file_' + idx.toString();
        $(is_public).attr('id', id);
        $(is_public_label).attr('for', id)
        $('#upload_controls').show();
        $('#show_advanced').show();
        if (opts.file_public_default == 1) $(is_public).attr('checked', 'true');
        $(del).click(function() {
            $(table).remove();
            inner_files[idx] = undefined;
            if ($.grep(inner_files, function(e) {
                    return e != undefined
                }).length == 0) {
                $(file_input).parent().css('display', '');
                $('#file_0').get(0).value = "";
                $('#upload_controls').hide();
                $('#show_advanced').hide();
                $('#advanced_opts').hide();
                $('#upload_controls .btn-primary').attr('disabled', ' ');
                $('.more-btn-position').hide();
                $('.drag-text').text('Drag and Drop files');
            }
        });
        if (opts.max_upload_files > 0 && $(target).find('.xrow').length >= opts.max_upload_files) {
            alert("No remaining slots");
            return false;
        }
        if (checkExt(file) && checkSize(file)) {
            $(cell).append(xfname, xfsize, del);
            $(row).append(cell);
            $(table).append(row);
            $(target).append(table);
            inner_files.push(file);
            $(file_input).parent().css('display', 'none');
            $(target).css('display', '');
            that.files_added++;
            return true;
        }
        return false;
    };
    var addFileCallback = function(event) {
        that.files_added = 0;
        $(this.files).each(function(i, file) {
            that.addFile(file);
        });
    };
    var installUploadControls = function() {
        if (that.upload_controls) return;
        that.upload_controls = true;
        var bottom = $('<table id="upload_controls">');
        var addMorePosition = $('.more-btn-position');
        var start_upload = $('<input type="button" class="btn btn-success" name="upload" value="Start upload">');
        var add_more = $('<input type="button" id="add_more" value="Add more">');
        var add_more_finput = $('<input type="file" id="moreFiles" class="inputfile"><label class="btn btn-primary" for="moreFiles">Add more</label>');
        var show_advanced_container = $('<div id="show_advanced"></div>');
        var show_advanced = $('<button type="button" class="btn btn-primary">Show advanced</button>');
        $(show_advanced).click(function() {
            $('#advanced_opts').show();
            $(this).attr('disabled', 'disabled');
        });
        addMorePosition.append(add_more_finput);
        bottom.append(show_advanced);
        bottom.append(start_upload);
        bottom.append(add_more);
        $('.drag-text').text('Drag and Drop more files');
        setTimeout(function() {}, 0);
        $(start_upload).click(function(e) {
            var files = $.grep(inner_files, function(e) {
                return e != undefined
            });
            if (opts.oncomplete) opts.oncomplete(files);
            $('#show_advanced').hide();
            $('#advanced_opts').hide();
            e.preventDefault();
        });
        $(add_more_finput).change(addFileCallback);
        if (accept) $(add_more_finput).attr('accept', accept);
        $(target).parent().append(show_advanced_container);
        $(target).parent().append(bottom);
    };
    this.installUploadControls = installUploadControls;
    var checkExt = function(file) {
        if (file.name == "") return true;
        var re1 = new RegExp("^.+\.(" + opts.ext_allowed + ")$", "i");
        var re2 = new RegExp("^.+\.(" + opts.ext_not_allowed + ")$", "i");
        if ((opts.ext_allowed && !re1.test(file.name)) || (opts.ext_not_allowed && re2.test(file.name))) {
            str = '';
            if (opts.ext_allowed) str += "\nOnly these extensions are allowed: " + opts.ext_allowed.replace(/\|/g, ',');
            if (opts.ext_not_allowed) str += "\nThese extensions are not allowed:" + opts.ext_not_allowed.replace(/\|/g, ',');
            alert("Extension not allowed for file: \"" + file.name + '"' + str);
            return false;
        }
        return true;
    }
    var checkSize = function(obj) {
        if (obj.name == '') return true;
        if (!opts.max_upload_filesize || opts.max_upload_filesize == 0) return true;
        if (obj.size > 0 && obj.size > opts.max_upload_filesize * 1024 * 1024) {
            alert("File size limit is " + opts.max_upload_filesize + " Mbytes");
            return false;
        }
        return true;
    }
    $(file_input).change(addFileCallback);
    $(file_input).change(function() {
        if (that.files_added > 0) installUploadControls();
    });
}

function convertSize(size) {
    if (size > 1024 * 1024 * 1024) {
        size = Math.round(size / (1024 * 1024 * 1024) * 10) / 10 + " Gb";
    } else if (size > 1024 * 1024) {
        size = Math.round(size / (1024 * 1024) * 10) / 10 + '';
        if (!size.match(/\./)) size += '.0';
        size += ' Mb';
    } else if (size > 1024) {
        size = Math.round(size / 1024 * 10) / 10 + " Kb";
    } else {
        size = size + " Bytes";
    }
    return size;
}