const rp = require('request-promise')
const utf8 = require('utf8');
const fs = require('fs');
const sleep = require('util').promisify(setTimeout)

 
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const apiKey = 'dc668952146a4a25b6d06586e7b69708'

const DEFAULT_REQUEST_OPTIONS = {
    rejectUnauthorized: false,
    resolveWithFullResponse: true,
    simple: false,
    time: true,
  };

function urlNormalize(sitePath, musicData){
  console.log(musicData)
  const musicInfo = musicData.split('–')

  const musicName = musicInfo[0]
  const nameData = musicName.split(' ')

  let name = undefined

  if(nameData.length > 2){
    for(const data of nameData){
      if(data !== '') {
        if(name === undefined){
          name = data
        }else {
          name = name + '-' + data
        }
      } 
    }
  }
  else{
    name = nameData[0]
  }

  const artistName = musicInfo[1].normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

  console.log(musicInfo)
  return `${sitePath}?art=${artistName}&mus=${name}&apikey=${apiKey}`

}

async function musicSearch(param){

  const sitePath = "https://api.vagalume.com.br/search.php"

  const url = urlNormalize(sitePath, param)

  const musicInfo = param.replace(/ /g, '').split('–')

    const options = {
        uri: url
      }

        try {
          await sleep(1500)
          const response = await rp(options);
          const responseData = JSON.parse(response)
          const musicText = (responseData.type === 'exact' || responseData.type === 'aprox') ? responseData.mus[0].text.replace(/(\r\n|\n|\r)/gm, " ") : undefined
          return {name: musicInfo[0], artist: musicInfo[1], textMusic: musicText, musicUrl: url, searchStatus: responseData.type}
        } catch(error) {
          console.log(error)
          return {name: musicInfo[0], artist: musicInfo[1], textMusic: undefined, musicUrl: url, searchStatus: 'requestError'}
  
        }
}

async function generateReport(musics) {
  console.log("preparing report ...")
  let csv = '\ufeff'
  csv += 'Music;Artist;Text;Url;Search Status\n'
  for (const music of musics) {
    csv += `${music.name};`
    csv += `${music.artist};`
    csv += `${music.textMusic};`
    csv += `${music.musicUrl};`
    csv += `${music.searchStatus}\n`
  }
  return new Promise((resolve, reject) => {
    fs.writeFile('musicReport.csv', csv, (error) => {
      if (error) {
        reject(error)
      } else {
        console.log(`Relatório gerardo: report-Customers-To-Delete-Dominos.csv`);
        resolve()
      }
    })
  })
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
    const musicsToSave = []
    for(const music of musics) {
      const musicResultSearch = await musicSearch(music.textContent)
      musicsToSave.push(musicResultSearch)
    }

    await generateReport(musicsToSave)
    // console.log(musicsToSave)
}

run()
