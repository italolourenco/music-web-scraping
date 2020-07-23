const rp = require('request-promise')
 
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const DEFAULT_REQUEST_OPTIONS = {
    rejectUnauthorized: false,
    resolveWithFullResponse: true,
    simple: false,
    time: true,
  };

function paramNormalize(param){
    const result = encodeURI(param)
    return result
}

async function musicSearch(param){

    const normalizeParam = paramNormalize(param)

    const url = `https://www.letras.mus.br/?q=${normalizeParam}`


    const options = {
        uri: url
      }

    const response = await rp(options);
      
    const jsdomOpts = Object.assign({}, DEFAULT_REQUEST_OPTIONS, { url: options.uri });
    const dom = new JSDOM(response, jsdomOpts);

    const search = dom.window.document.querySelector('div.wrapper > #all > #cnt_top > #res_busca > #resultado > div.all > #cse-search-results > #___gcse_0')
    console.log(search)
    // const teste = search.querySelector
    // console.log(teste.querySelector('div.gsc-control-cse gsc-control-cse-pt-PT'))
    // console.log(search.getAttribute('href'))
}


async function run() {
    
const options = {
  uri: 'https://maistocadas.mus.br/anos-70/'
}
    const response = await rp(options);

    const jsdomOpts = Object.assign({}, DEFAULT_REQUEST_OPTIONS, { url: options.uri });
    const dom = new JSDOM(response, jsdomOpts);

    const htmlOlistElement = dom.window.document.querySelector('#post-9579 > div > section > div.lista > ol')
    const musics = htmlOlistElement.children
    const musicResultSearch = await musicSearch('Detalhes – Roberto Carlos – 1971')
    // console.log(musicResultSearch)
    // for(const music of musics) {
    //     console.log(music.textContent)
    // }
}

run()
