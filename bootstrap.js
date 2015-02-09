
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

const XMLHttpRequest =
  Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1",
                         "nsIXMLHttpRequest");

var greasecooper = {};
greasecooper.getScriptDirName = function() {
  return "gm_scripts";
};
greasecooper.getScriptDir = function(basedir) {
    var scriptdir = Components
      .classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties)
      .get("ProfD", Components.interfaces.nsIFile);
    scriptdir.append(greasecooper.getScriptDirName());
    if (basedir) { scriptdir.append(basedir); }
    if (!scriptdir.exists()) {
      scriptdir.create(
                        Components.interfaces.nsIFile.DIRECTORY_TYPE,
                        parseInt('750', 8));
    }
    scriptdir.normalize();  // in case of symlinks

    return scriptdir;
};

greasecooper.copyChromefile = function(filename, basedir, extname) {
  try {
    Services.console.logStringMessage("FETCH: " + filename);
    var relpath = [basedir,filename];
    var chromeurl = ["chrome://"+extname+"/content"].concat(relpath).join("/");
    Services.console.logStringMessage("FETCH2: " + chromeurl);
    var scriptdir = greasecooper.getScriptDir(basedir);
    
    var file = Components
    .classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("ProfD", Components.interfaces.nsIFile);
    file.append(greasecooper.getScriptDirName());
    file.append(basedir);
    file.append(filename);

    var ostream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
    ostream.init(file, -1, -1, 0);
    
    NetUtil.asyncFetch(chromeurl, function(istream, result, request) {
      if (!Components.isSuccessCode(result)) { return; }
      NetUtil.asyncCopy(istream, ostream, function(copyResult) {
      });
    });
  } catch (ee) {
    Services.console.logStringMessage("NOFETCH: " + ee.message);
  }
};


function install(data,reason) {
    Services.console.logStringMessage("INSTALL");
}
function uninstall(data,reason) {
    Services.console.logStringMessage("UNINSTALL");
}
function shutdown(data,reason) {
    Services.console.logStringMessage("SHUTDOWN");
}
function startup(data,reason) {
  Services.console.logStringMessage("STARTUP: " + Object.keys(data).join(","));

  var extid = data.id;
  var extname = extid.split(/\@/)[0];

    var SCRIPT_DIR = greasecooper.getScriptDir(null);
    
    var file = Components
          .classes["@mozilla.org/file/directory_service;1"]
          .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsIFile);
    file.append(greasecooper.getScriptDirName());
    file.append("config.xml");

    var ostream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
    ostream.init(file, -1, -1, 0);
    
    try {
      NetUtil.asyncFetch("chrome://"+extname+"/content/config.xml", function(istream, result, request) {
        if (!Components.isSuccessCode(result)) { return; }
        NetUtil.asyncCopy(istream, ostream, function(copyResult) {
        });
      });


      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        var configDoc = xhr.responseXML;
        var userscripts = configDoc.evaluate("//Script",
                                             configDoc,
                                             null,
                                             0,
                                             null);

        var filenames = [];
        var userscript = userscripts.iterateNext();
        while (userscript) {
          var filename = userscript.getAttribute("filename").toString();
          var basedir = userscript.getAttribute("basedir").toString();
          filenames.push(filename);
          greasecooper.copyChromefile(filename, basedir, extname);

          var resources = configDoc.evaluate(".//Require|.//Resource",
                                             userscript,
                                             null, 0, null);
          var resource = resources.iterateNext();
          while (resource) {
            var rfilename = resource.getAttribute("filename").toString();
            greasecooper.copyChromefile(rfilename, basedir, extname);
            resource = resources.iterateNext();            
          }
          
          userscript = userscripts.iterateNext();
        }
        Services.console.logStringMessage("XPATH: " + filenames.join(","));
        
        
      }
      xhr.onerror = function() {
        Services.console.logStringMessage("Error while getting XML.");

     }

      xhr.open("GET", "chrome://"+extname+"/content/config.xml");
      xhr.responseType = "document";
      xhr.send();

      return;
      
    } catch (ee) {
      Services.console.logStringMessage("EXCEPTION!");
      Services.console.logStringMessage("EXCEPTION!" + ee.message);
    }
}
