function ProgressTracker(element, opts) {
    var progressbar_outer = $('<div class="progressbar-outer progress">');
    var progressbar_inner = $('<div class="progressbar-inner progress-bar progress-bar-striped active" role="progressbar"></div>');
    var filenames = $('<div class="progressbar-filenames">');
    var completed = $('<div class="progressbar-completed">');
    var speed = $('<div class="progressbar-speed">');
    var abort = $('<a href="#">Abort</a>');
    if (opts && opts.filenames) {
        $(filenames).html('<b>' + $.makeArray(opts.filenames).join(', ') + '</b>');
    }
    $(speed).html('Upload speed: <b>0 Kb/s</b>');
    $(abort).click(opts.onabort ? opts.onabort : function() {
        document.location.reload();
    });
    $(abort).css('text-decoration', 'none');
    $(progressbar_outer).append(progressbar_inner);
    $(element).append(progressbar_outer, '<br>', filenames, completed, speed, abort);
    var old_date;
    var old_bytes = 0;
    var total_size = 0;
    this.update = function(info) {
        var rate = info.loaded / info.total;
        $(element).find('.progressbar-inner').css('width', Math.round(rate * $('.progressbar-outer').width()));
        $(completed).html('<b>' + convertSize(info.loaded) + '</b> of <b>' + convertSize(info.total) + '</b>');
        total_size = info.total;
        if (!old_date) old_date = Date.now();
        var elapsed = Date.now() - old_date;
        if (elapsed > 1000) {
            $(speed).html('Upload speed: <b>' + convertSize(info.loaded - old_bytes) + '/s</b>');
            old_bytes = info.loaded;
            old_date = Date.now();
        }
    };
    this.finish = function(evt, opts) {
        if (evt.target.status != 200)
            return;
        this.update({
            loaded: total_size,
            total: total_size
        });
        var ret, res;
        try {
            res = evt.target.responseText;
            ret = JSON.parse(res.substring(res.lastIndexOf("\n") + 1));
        } catch (e) {
            alert("Error while parsing JSON:\n\n" + res);
        }
        var redirect_params = $(ret).map(function(i, e) {
            return "st=" + e.file_status + "&fn=" + e.file_code;
        });
        if (this.link_rcpt) {
            redirect_params.push('link_rcpt=' + this.link_rcpt);
        }
        if (ret.length == 0) {
            alert("None files uploaded");
            return;
        }
        document.location = opts.return_url + redirect_params.toArray().join('&');
    };
    this.set_link_rcpt = function(link_rcpt) {
        this.link_rcpt = link_rcpt;
    };
}

function FileUploader(f1, opts) {
    this.start = function(files) {
        var req = formToXHR(f1);
        $(files).each(function(i, e) {
            req.fd.append("file_" + i.toString(), e);
        });
        var filenames = $(files).map(function(i, e) {
            return e.name
        });
        var tracker = new ProgressTracker($(f1).find('.progress_div'), {
            filenames: filenames
        });
        var link_rcpt = $(f1).get(0).link_rcpt;
        if (link_rcpt) tracker.set_link_rcpt(link_rcpt.value);
        req.xhr.upload.addEventListener("progress", tracker.update);
        req.xhr.addEventListener("load", function(evt) {
            tracker.finish(evt, opts)
        });
        $('#files_list').css('display', 'none');
        $('#upload_controls').css('display', 'none');
        req.start();
    };
}

function URLUploader(form, element, opts) {
    this.start = function() {
        var urls = $(form).get(0).url_mass.value;
        if (!urls.match(/\S/)) {
            alert("Enter one or more URLs to upload");
            return false;
        }
        var uid = genUID();
        var req = formToXHR(form, $(form).attr('action') + "&upload_id=" + uid);
        $('.reurlupload form').hide();
        var filenames = $(urls.match(/[^\r\n]+/g)).map(function(i, e) {
            var url = document.createElement('a');
            url.href = e;
            return url.pathname.split('/').slice(-1)[0];
        });
        var kill_upload = function() {
            req.xhr.abort();
            $.ajax({
                url: $(form).attr('action') + '&kill=' + uid,
                success: function() {
                    document.location.reload();
                }
            });
        };
        var tracker = new ProgressTracker(element, {
            filenames: getFilenames(urls),
            onabort: kill_upload
        });
        setInterval(function() {
            $.ajax({
                url: opts.tmp_url + "/" + uid + ".json",
                dataType: 'jsonp',
                jsonpCallback: 'update_stat',
                success: function(evt) {
                    tracker.update(evt)
                },
            });
        }, 1000);
        req.xhr.addEventListener("load", function(evt) {
            tracker.finish(evt, opts)
        });
        req.start();
    };
}

function TorrentUploader(form) {
    var req = formToXHR(form);
    req.xhr.addEventListener("load", function() {
        document.location = '?op=my_files';
    });
    this.start = req.start;
}

function genUID() {
    var UID = '';
    for (var i = 0; i < 12; i++) UID += '' + Math.floor(Math.random() * 10);
    return UID;
}

function formToXHR(form, url) {
    var xhr = new XMLHttpRequest();
    post_url = url || $(form).attr('action');
    xhr.onerror = function(evt) {
        if (document.location.protocol == "https:" && !post_url.match(/^https:/)) {
            alert("Plain HTTP uploads are prohibited on HTTPS site by browser's security policies.\n\n" +
                "Please use your Admin Servers interface in order to switch file servers to HTTPS.");
        } else {
            var msg = evt.target.status ? evt.target.statusText : 'URL is not accessible';
            alert("Error while requesting " + post_url + ":\n\n" + msg);
        }
    };
    xhr.addEventListener("load", function(evt) {
        if (evt.target.status != 200) {
            alert(evt.target.responseText);
        }
    });
    xhr.open("POST", post_url);
    var fd = new FormData();
    var array = serializeForm(form);
    $(array).each(function(i, e) {
        fd.append(e.name, e.value);
    });
    fd.append('keepalive', '1');
    return {
        xhr: xhr,
        fd: fd,
        start: function() {
            xhr.send(fd);
        }
    };
}

function serializeForm(f1) {
    var ret = [];
    $(f1).find('input, select, textarea').each(function(_, element) {
        if (element.type == 'checkbox') {
            ret.push({
                'name': element.name,
                'value': element.checked ? element.value : ''
            });
        } else if (element.type == 'file') {} else {
            ret.push({
                'name': element.name,
                'value': element.value
            });
        }
    });
    return ret;
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

function getFilenames(urls) {
    var lines = urls.split(/\n\r?/);
    var ret = [];
    $(lines).each(function(i, e) {
        var url = document.createElement('a');
        url.href = e;
        var path = url.pathname.split('/');
        ret.push(path[path.length - 1]);
    });
    return ret;
}