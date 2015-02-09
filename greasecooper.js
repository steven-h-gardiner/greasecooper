#!/usr/bin/env node

var greasecooper = function() {
  var privy = {};
  privy.mods = {};
  privy.mods.nomnom = require('nomnom');
  privy.mods.cp = require('child_process');
  privy.mods.luigi = require('luigi');
  privy.mods.url = require('url');
  privy.mods.temp = require('temp');

  privy.src = {};
  privy.src.bootstrap = require.resolve('./bootstrap.js');
  privy.src.meta = require.resolve('./meta.xsl');
  privy.src.gmpatch = require.resolve('./greasemonkey.diff');

  privy.defaultout = "greasebarrel.xpi";
  
  var self = {};
  
  self.now = new Date();
  
  self.eq = process;
  self.parser = privy.mods.nomnom();
  

  self.parser.option("output", {
    abbr: "o",
    default: privy.defaultout,
  });
  self.parser.option("userscript", {
    abbr: "u",
    list: true,
    default: [],
  });
  self.parser.option("scriptdir", {
    abbr: "d",
    list: true,
    default: [],
  });
  self.parser.option("cleanup", {
    abbr: "c",
    flag: true,
    default: true,
  });
  
  self.procs = {};
  
  self.eq.on('parse', function(pSpec) {
    var dSpec = Object.create(pSpec || {});

    dSpec.cmd = dSpec.cmd || process.argv.slice(2);

    dSpec.opts = self.parser.parse(dSpec.cmd);

    dSpec.opts.paths = dSpec.opts.userscript.concat(dSpec.opts.scriptdir);
    if (dSpec.opts.paths.length === 0) {
      dSpec.opts.paths = ['./scripts'];
    }

    dSpec.opts.outbase = dSpec.opts.output.split(/\//).slice(-1).join("/").split(/\./).slice(0,-1).join(".");
    dSpec.opts.scriptdir = [dSpec.opts.outbase,'scripts'].join("-");
    dSpec.opts.scriptxpi = [dSpec.opts.scriptdir,'xpi'].join(".");

    console.error("OPTS: %j", dSpec.opts);
      
    if (dSpec.opts.cleanup) {
      privy.mods.temp.track();
    }
    
    privy.mods.temp.mkdir("greasecooper", function(err, dirPath) {
      console.error("DIRPATH: %s", dirPath);
      dSpec.tmpdir = dirPath;
      
      self.eq.emit('prep', dSpec);
    });
    
  });

  self.eq.on('download_resource', function(rSpec) {
    rSpec.url = privy.mods.url.parse(rSpec.location);
    rSpec.resolved = privy.mods.url.resolve(rSpec.baseurl, rSpec.location);
    rSpec.localfile = [rSpec.tmpdir,rSpec.scriptdir,'content',rSpec.basedir,rSpec.filename].join("/");
    console.error("DOWNLOAD %j", rSpec);

    rSpec.downloads[rSpec.localfile] = rSpec.resolved;    
  });
  
  self.eq.on('prep', function(pSpec) {
    console.time('prep');
      
    var rSpec = Object.create(pSpec || {});

    self.procs.prep =
      privy.mods.cp.spawn('bash', ['-'],
                          {
                          cwd: rSpec.tmpdir,
                          });

    self.procs.prep.stdout.pipe(process.stdout);
    self.procs.prep.stderr.pipe(process.stderr);

    self.procs.prep.stdout.on('end', function() {
      console.timeEnd('prep');
        
      self.eq.emit('readscripts', rSpec);
    });
    
    self.procs.prep.stdin.write(["mkdir -p",
                                 [rSpec.opts.scriptdir,
                                  "content"
                                  ].join("/"),
                                 "\n"
                                 ].join(" "));
    self.procs.prep.stdin.write(["cp",
                                 privy.src.bootstrap,
                                 [rSpec.opts.scriptdir,"bootstrap.js"].join("/"),
                                 "\n"
                                 ].join(" "));
    self.procs.prep.stdin.write(["xsltproc",
                                 "--stringparam target manifest",
                                 ["--stringparam extname",rSpec.opts.scriptdir].join(" "),
                                 privy.src.meta,
                                 privy.src.meta,
                                 ["> ",rSpec.opts.scriptdir,"/chrome.manifest"].join(""),
                                 "\n"
                                 ].join(" "));
    self.procs.prep.stdin.write(["xsltproc",
                                 "--stringparam target userrdf",
                                 ["--stringparam extname",rSpec.opts.scriptdir].join(" "),
                                 privy.src.meta,
                                 privy.src.meta,
                                 ["> ",rSpec.opts.scriptdir,"/install.rdf"].join(""),
                                 "\n"
                                 ].join(" "));
    self.procs.prep.stdin.write(["xsltproc",
                                 privy.src.meta,
                                 privy.src.meta,
                                 "> install.rdf",
                                 "\n"
                                 ].join(" "));
    self.procs.prep.stdin.write(['wget -o /tmp/greasemonkey.log -N "https://addons.mozilla.org/firefox/downloads/latest/748/addon-748-latest.xpi"',
                                 'ln -f addon-748-latest.xpi greasemonkey-orig.xpi',
                                 'mkdir greasemonkey',
                                 'cd greasemonkey',
                                 'unzip ../greasemonkey-orig.xpi',
                                 ['cat',privy.src.gmpatch,'| patch -p1'].join(" "),
                                 'zip -r ../greasemonkey.xpi *',
                                 '\n'
                                 ].join(" ; "));
    
    self.procs.prep.stdin.end();

    
  });
  
  self.eq.on('readscripts', function(rSpec) {
    console.time('readscripts');
    var cSpec = Object.create(rSpec || {});

    cSpec.downloads = {};
    
    self.procs.find =
      privy.mods.cp.spawn('bash',
                          ['-c',
                           [['find'].concat(
                                           rSpec.opts.paths).concat([
                                                   '-type', 'f',
                                                   '-name', '*.user.js',
                                                                     ]).join(" "),
                            'tee /tmp/greasecooper_userscripts_rel.txt',
                            'parallel realpath {}',
                            'tee /tmp/greasecooper_userscripts_abs.txt',
                            'parallel grep -H . {}',
                            'tee /tmp/greasecooper_userscripts_grep.txt',
                            ].join(" | ")]);

    self.procs.filt = new privy.mods.luigi.filter();
    self.procs.filt.meta = {};
    self.procs.filt.meta.state = "out";
    self.procs.filt.on('line', function(line) {
      var that = this;
      var info = {};
      info.parts = line.split(/\.user\.js:/);
      info.filepath = info.parts[0] + ".user.js";
      info.fileline = info.parts.slice(1).join('.user.js:');

      info.filename = info.filepath.split('/').pop();

      info.baseurl = ["file://",info.filepath].join("");
      
      if (this.meta.state === 'out') {
        if (info.fileline.match(/^\s*\/\/\s*\=\=UserScript\=\=/)) {
          this.meta.state = 'in';
          this.meta.info = {};
          this.meta.multi = {};
          this.meta.multi.grant = [];
          this.meta.multi.include = [];
          this.meta.multi.exclude = [];
          this.meta.multi.require = [];
          this.meta.multi.resource = [];
          this.output.write("/UserScriptConfig/Script\n");
          this.output.write("/UserScriptConfig/Script/@enabled=true\n");
          this.output.write(["/UserScriptConfig/Script/@filename=",
                             info.filename,
                             "\n"].join(""));
          this.output.write(["/UserScriptConfig/Script/@installTime=",
                             self.now.getTime(),
                             "\n"].join(""));
          this.output.write(["/UserScriptConfig/Script/@modified=",
                             self.now.getTime(),
                             "\n"].join(""));
          this.output.write(["/UserScriptConfig/Script/@installurl=",
                             info.baseurl,
                             "\n"].join(""));
          this.output.write(["/UserScriptConfig/Script/@updateurl=",
                             info.baseurl,
                             "\n"].join(""));
          this.output.write("/UserScriptConfig/Script/@checkRemoteUpdates=0\n");
        }
      }
      if (this.meta.state === 'in') {
        if (info.fileline.match(/^\s*\/\/\s*\@/)) {
          info.iparts = info.fileline.split(/\@/).slice(1).join("@").split(/\s+/);
          info.ikey = info.iparts[0];
          info.ivals = info.iparts.slice(1);
          info.ival = info.ivals.join(" ");

          this.meta.info[info.ikey] = info.ivals;

          if (this.meta.multi[info.ikey]) {
            this.meta.multi[info.ikey].push(info.ivals);
          }
          
          switch (info.ikey) {
            case "author":
            case "grant":
            case "include":
            case "exclude":
            case "require":
            case "resource":
              break;
            case "name":
              this.meta.info.basedir = info.ival.replace(/\s/g, '_');
              this.output.write(["/UserScriptConfig/Script/@",
                                 "basedir",
                                 '=',
                                 this.meta.info.basedir,
                                 "\n"
                                 ].join(""));
              self.eq.emit('download_resource', {
                location: info.filename,
                filename: info.filename,
                basedir: that.meta.info.basedir,
                baseurl: info.baseurl,
                downloads: cSpec.downloads,
                scriptdir: cSpec.opts.scriptdir,
                tmpdir: cSpec.tmpdir,    
              });
            default:
              this.output.write(["/UserScriptConfig/Script/@",
                                 info.ikey,
                                 '=',
                                 info.ival,
                                 "\n"
                                 ].join(""));
          }
          
          if (info.ikey === 'require') {
            
          }
        }
        if (info.fileline.match(/^\s*\/\/\s*==\/UserScript==/)) {
          for (var multikey in this.meta.multi) {
            var eltname = [multikey.substring(0,1).toUpperCase(),
                           multikey.substring(1)].join("");

            var ix = 0;
            this.meta.multi[multikey].forEach(function(vals) {
              that.output.write("/UserScriptConfig/Script/!=sep\n");

              switch (multikey) {
                case "resource":
                  var rezname = vals[0];
                  that.output.write(["/UserScriptConfig/Script/",
                                     eltname,
                                     '/@name=',
                                     rezname,
                                     "\n"
                                     ].join(""));
                case "require":
                  var filename = vals.slice(-1)[0].split(/\//).pop();
                  that.output.write(["/UserScriptConfig/Script/",
                                     eltname,
                                     '/@filename=',
                                     filename,
                                     "\n"
                                     ].join(""));
                  self.eq.emit('download_resource', {
                    location: vals.slice(-1)[0],
                    filename: filename,
                    basedir: that.meta.info.basedir,
                    baseurl: info.baseurl,
                    downloads: cSpec.downloads,
                    scriptdir: cSpec.opts.scriptdir,
                    tmpdir: cSpec.tmpdir,
                  });
                  break;
                default: 
                  that.output.write(["/UserScriptConfig/Script/",
                                     eltname,
                                     '=',
                                     vals.join(""),
                                     "\n"
                                     ].join(""));
              }
              ix++;
            });
          }
          
          this.meta.state = 'out';
        }
      }

      info.meta = this.meta;
      console.error(JSON.stringify(info));
    });

    self.procs.writexml =
      privy.mods.cp.spawn('bash', ['-c',
                                   ['tee /tmp/gc.prexml',
                                    '2xml',
                                    'xmllint --format -',
                                    'tee /tmp/gc.xml',
                                    'tee content/config.xml'
                                    ].join(" | ")], {
                          cwd: [cSpec.tmpdir, cSpec.opts.scriptdir].join("/"),
                          });
    
    self.procs.find.stdout.pipe(self.procs.filt.stdin);
    self.procs.find.stderr.pipe(process.stderr);

    self.procs.filt.stdout.pipe(self.procs.writexml.stdin);

    self.procs.writexml.stdout.pipe(process.stdout);
    self.procs.writexml.stderr.pipe(process.stderr);

    self.procs.writexml.stdout.on('end', function() {
      console.timeEnd('readscripts');
      self.eq.emit('downloads', cSpec);
    });
  });

  self.eq.on('downloads', function(dSpec) {
    console.time('downloads');

    var oSpec = Object.create(dSpec || {});

    console.error("DOWNLOADS: %j", oSpec.downloads);

    self.procs.downloader =
      privy.mods.cp.spawn('bash', ['-c',
                                   ['tee /tmp/downloads.txt',
                                    'parallel -n2 curl -L --create-dirs --output "{2}" "{1}"',
                                    ].join(" | ")]);

    self.procs.downloader.stdout.pipe(process.stdout);
    self.procs.downloader.stderr.pipe(process.stderr);

    self.procs.downloader.stdout.on('end', function() {
      console.timeEnd('downloads');
      self.eq.emit('package_barrel', oSpec);
    });

    for (var localfile in oSpec.downloads) {
      self.procs.downloader.stdin.write(oSpec.downloads[localfile]);
      self.procs.downloader.stdin.write("\n");
      
      self.procs.downloader.stdin.write(localfile);
      self.procs.downloader.stdin.write("\n");
    }
    self.procs.downloader.stdin.end();

  });

  self.eq.on('package_barrel', function(pSpec) {
    console.time('package');
    var oSpec = Object.create(pSpec || {});

    self.procs.bpack =
      privy.mods.cp.spawn('bash', ['-c',
                                   [['( cd',
                                     pSpec.opts.scriptdir,
                                     ';',
                                     'ls -d *',
                                     '|',
                                     'parallel -n999 jar cvf',
                                     ['..',pSpec.opts.scriptxpi].join("/"),
                                     ')'
                                     ].join(" "),
                                    ['jar cvf ',
                                     [process.cwd(),pSpec.opts.output].join("/"),
                                     ' greasemonkey.xpi ',
                                     pSpec.opts.scriptxpi,
                                     'install.rdf'
                                     ].join(" "),
                                    ].join(" ; ")], {
                          cwd: pSpec.tmpdir
                              });

    self.procs.bpack.stdout.pipe(process.stdout);
    self.procs.bpack.stderr.pipe(process.stderr);

    self.procs.bpack.stdout.on('end', function() {
      console.timeEnd('package');
    });
  });
  
  return self;
}();

greasecooper.eq.emit('parse');


