const rp = require('request-promise')
const fs = require('fs');
const sleep = require('util').promisify(setTimeout)

const puppeteer = require("puppeteer-extra")
const pluginStealth = require("puppeteer-extra-plugin-stealth")
puppeteer.use(pluginStealth())

const jsdom = require('jsdom');
const { JSDOM } = jsdom

const apiKey = 'dc668952146a4a25b6d06586e7b69708'

function normalizeText(text){
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

function removeSpecialCharacters(text){
  return text.replace(",", "").replace("`", "").replace("’", "")
}

function formatText(text){
  return text.replace(/(\r\n|\n|\r)/gm, " ")
}

function setupMusicName(text){

  const musicNameSplit = text.split(' ')

  let musicName = undefined

  if(!musicNameSplit.length > 2) {
    musicName = musicNameSplit[0]
    return musicName
  }

  for(const name of musicNameSplit){
    if(name !== ''){
      const nameText = removeSpecialCharacters(name)
      musicName = musicName === undefined ? nameText : musicName + '-' + nameText
    }
  }

  return musicName
}

function createMusicData(musicContext){

  const splitMusicContext = musicContext.split('-')

  const musicData = {
    name : splitMusicContext[0],
    artist : splitMusicContext[1],
    year : splitMusicContext[2]
  }

  return musicData
}

function createMusicInfo(musicData){

  musicName = setupMusicName(musicData.name)

  const artistName = normalizeText(musicData.artist)
  name = normalizeText(musicName)

  const musicInfo = {
    artistName: artistName,
    name: name
  }

  return musicInfo

}

function makeVagalumeApiUrl(musicData){

  const vagalumeApiPath = "https://api.vagalume.com.br/search.php"

  const musicInfo = createMusicInfo(musicData)

  const url = `${vagalumeApiPath}?art=${musicInfo.artistName}&mus=${musicInfo.name}&apikey=${apiKey}`

  return url

}

function makeGoogleSearchUrl(musicData){

  const googleSearchUrl = "https://www.google.com/search?q="

  const musicInfo = createMusicInfo(musicData)

  const url = `${googleSearchUrl}${musicInfo.artistName}${musicInfo.name}`

  return url

}

async function googleSearch(param){

  const url = makeGoogleSearchUrl(param)

  try {

    const browser = await puppeteer.launch({ headless:true, args: ['--start-maximized']})

    const page = await browser.newPage()
    await page.goto(url)
    await page.waitFor(2000)
    await page.click('#kp-wp-tab-overview > div.cLjAic.LMRCfc > div > div > div > div > div:nth-child(2) > g-expandable-container > div > div.Oh5wg > div.PZPZlf > g-expandable-content:nth-child(1) > span > div > g-text-expander > a')
    await page.waitFor(2000)
  
    const text = await page.evaluate(() => {
  
      let elements = [
          ...document.querySelectorAll('#kp-wp-tab-overview > div.cLjAic.LMRCfc > div > div > div > div > div:nth-child(2) > g-expandable-container > div > div.Oh5wg > div.PZPZlf')
      ]
  
      return elements.map((div) => {
        return div.innerText
      })
    })

    const lang = await page.evaluate(() => {
  
      let elements = [
        ...document.querySelectorAll('#kp-wp-tab-overview > div.cLjAic.LMRCfc > div > div > div > div')
      ]
  
      return elements.map((div) => {
        return div.getAttribute("lang")
      })
    })

    browser.close()
    return {music : text, lang: lang}

  }catch (error) {
    return undefined
  }
}

async function vagalumeApiMusicSearch(musicData){

  const url = makeVagalumeApiUrl(musicData)

  const apiVagalumeMusicResult = { 
    name: musicData.name, 
    artist: musicData.artist, 
    textMusic: '', 
    lang: '', 
    musicUrl: url, 
    searchStatus: 'initialSearch' }

  try {
    await sleep(1500)
    const response = await rp({ uri: url })
    const responseData = JSON.parse(response)

    apiVagalumeMusicResult.textMusic = (responseData.type === 'exact' || responseData.type === 'aprox') 
    ? formatText(responseData.mus[0].text) 
    : '-'

    apiVagalumeMusicResult.lang = responseData.mus[0].lang === 1 ? "PT-BR" : "EN-US"
    apiVagalumeMusicResult.searchStatus = 'OK'
    return apiVagalumeMusicResult
    } 

    catch(error) {
      apiVagalumeMusicResult.searchStatus = 'vagalumeAPiError'
      return apiVagalumeMusicResult
    }
}

async function generateReport(musics, year) {
  console.log("preparing report ...")
  let csv = '\ufeff'
  csv += 'Music;Artist;Text;Language;Url;Search Status;\n'
  for (const music of musics) {
    csv += `${music.name};`
    csv += `${music.artist};`
    csv += `${music.textMusic};`
    csv += `${music.lang};`
    csv += `${music.musicUrl};`
    csv += `${music.searchStatus}\n`
  }
  return new Promise((resolve, reject) => {
    fs.writeFile(`musicReport-${year}.csv`, csv, (error) => {
      if (error) {
        reject(error)
      } else {
        console.log(`Relatório gerardo: report-Customers-To-musicReport.csv`);
        resolve()
      }
    })
  })
}

async function getMusicList(link){

  const response = await rp({ uri: link.link });

  const dom = new JSDOM(response);

  const htmlOlistElement = dom.window.document.querySelector(link.selector)
  const musics = htmlOlistElement.children

  return musics
}

async function getMusicWithGoogle(musicData){
  
  const googleSearchMusicResult = {
    textMusic: '',
    lang: '',
    searchStatus: 'ERROR'
  }

  const result = await googleSearch(musicData)

  if(!result){
    return googleSearchMusicResult
  }

  googleSearchMusicResult.textMusic = formatText(result.music[0])
  googleSearchMusicResult.lang = result.lang[0] === 'pt-BR' ? "PT-BR" : "EN-US"
  googleSearchMusicResult.searchStatus = "OK"

  return googleSearchMusicResult
}

async function run() {

  const linksData = require("./input/links.json")

    for(const link of linksData) {

      const musicsToSave = []
      const musics = await getMusicList(link)

      for(const music of musics) {

        const musicData = createMusicData(music.textContent)
        const musicResult = await vagalumeApiMusicSearch(musicData)
  
        if(musicResult.searchStatus === 'vagalumeAPiError'){
          const googleSearchMusicResult = getMusicWithGoogle(musicData)

          if(googleSearchMusicResult?.searchStatus === 'OK'){
            musicResult.textMusic = googleSearchMusicResult.textMusic
            musicResult.lang = googleSearchMusicResult.lang
            musicResult.searchStatus = googleSearchMusicResult.searchStatus
          }
        }

        if(musicResult.lang === "PT-BR") musicsToSave.push(musicResult)
      }
      await generateReport(musicsToSave, link.year)
    }
    return
}

run()
