const rp = require('request-promise')
 
const jsdom = require('jsdom')
const { JSDOM } = jsdom


async function run() {

    const DEFAULT_REQUEST_OPTIONS = {
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        simple: false,
        time: true,
      };
    

const options = {
  uri: 'https://maistocadas.mus.br/anos-70/'
}
    const response = await rp(options);

    const jsdomOpts = Object.assign({}, DEFAULT_REQUEST_OPTIONS, { url: options.uri });
    const dom = new JSDOM(response, jsdomOpts);

    const htmlOlistElement = dom.window.document.querySelector('#post-9579 > div > section > div.lista > ol')
    const musics = htmlOlistElement.children
    for(const music of musics) {
        console.log(music.textContent)
    }
}

run()
