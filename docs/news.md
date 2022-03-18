## Related designs news architecture

Probably a load balancer for the conquest mode:
  POST to http://news.related-designs.de/news/conquesturl
  application/x-www-form-urlencoded
    versionname=GOLDMASTER
  =>
  conquest1.rds.co:80


Getting news pages:

curl http://news.related-designs.de/news/get
  -A "RD NEWS SERVICE 1.1"
  -d "lang=ger&versionname=GOLDMASTER"

  POST http://news.related-designs.de/news/get
    User-Agent: RD NEWS SERVICE 1.1
    Content-Type: application/x-www-form-urlencoded
      lang=ger
      versionname=GOLDMASTER
  =>
  Patch-Notes 2.0§|§http://rd-net.com/news/newspages/patchnotes_patch8_ger.html§|§Addon erhältlich§|§http://rd-net.com/news/newspages/addon_ger.html;-1123250§|§ANNO Online§|§http://news.related-designs.de/news/newspages/annoonline_ger.html
  

News pages:
  User-Agent: Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_7; da-dk) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1
  http://news.related-designs.de/news/newspages/annoonline_ger.html
  http://rd-net.com/news/newspages/patchnotes_patch8_ger.html

