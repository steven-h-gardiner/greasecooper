parallel --version || (echo "parallel is missing but required" 1>&2 && false) || exit 1
xsltproc --version || (echo "xsltproc is missing but required" 1>&2 && false) || exit 1
wget --version || (echo "wget is missing but required" 1>&2 && false) || exit 1
which jar || (echo "jar is missing but required" 1>&2 && false) || exit 1
which zip || (echo "zip is missing but required" 1>&2 && false) || exit 1
which unzip || (echo "unzip is missing but required" 1>&2 && false) || exit 1
which xml2 || (echo "xml2 is missing but required" 1>&2 && false) || exit 1
which 2xml || (echo "2xml is missing but required" 1>&2 && false) || exit 1

