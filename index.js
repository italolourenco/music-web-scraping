const rp = require('request-promise')
const utf8 = require('utf8');
const fs = require('fs');
const sleep = require('util').promisify(setTimeout)

const puppeteer = require("puppeteer-extra")
const pluginStealth = require("puppeteer-extra-plugin-stealth")
puppeteer.use(pluginStealth())

const jsdom = require('jsdom');
const { JSDOM } = jsdom


const links = [
  {
    year: 60,
    link: 'https://maistocadas.mus.br/anos-60/',
    selector: '#post-10214 > div > section > div.lista > ol'
  }, 
  {
    year: 70,
    link: 'https://maistocadas.mus.br/anos-70/',
    selector: '#post-9579 > div > section > div.lista > ol'
  },
  {
    year: 80,
    link: 'https://maistocadas.mus.br/anos-80/',
    selector: '#post-4345 > div > section > div.lista > ol'
  },
  {
    year: 90,
    link: 'https://maistocadas.mus.br/anos-90/',
    selector: '#post-9316 > div > section > div.lista > ol'
  },
  {
    year: 2000,
    link: 'https://maistocadas.mus.br/anos-2000/',
    selector: '#post-10185 > div > section > div.lista > ol'
  },
  {
    year: 2010,
    link: 'https://maistocadas.mus.br/anos-2010/',
    selector: '#post-17160 > div > section > div.lista > ol'
  }
]

const apiKey = 'dc668952146a4a25b6d06586e7b69708'

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
          name = data.replace(",", "").replace("`", "").replace("’", "")
        }else {
          name = name + '-' + data.replace(",", "").replace("`", "").replace("’", "");
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

function googleSearchUrl(param){

  const sitePath = "https://www.google.com/search?q="

  const musicInfo = param.split('–')

  const musicName = musicInfo[0]
  const nameData = musicName.split(' ')

  let name = undefined

  if(nameData.length > 2){
    for(const data of nameData){
      if(data !== '') {
        if(name === undefined){
          name = data.replace(",", "").replace("`", "").replace("’", "")
        }else {
          name = name + '-' + data.replace(",", "").replace("`", "").replace("’", "");
        }
      } 
    }
  }
  else{
    name = nameData[0]
  }

  const artistName = musicInfo[1].normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

  return `${sitePath}${artistName}${name}`

}

async function googleSearch(param){

  const url = googleSearchUrl(param)

  console.log(url)

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
          const musicLang = responseData.mus[0].lang === 1 ? "PT-BR" : "EN-US"
          return {name: musicInfo[0], artist: musicInfo[1], textMusic: musicText, lang: musicLang, musicUrl: url, searchStatus: responseData.type}
        } catch(error) {
          return {name: musicInfo[0], artist: musicInfo[1], textMusic: undefined, lang: undefined, musicUrl: url, searchStatus: 'requestError'}
  
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

async function run() {

    for(const link of links) {

      const musics = await getMusicList(link)
      const musicsToSave = []

      for(const music of musics) {
        const musicResultSearch = await musicSearch(music.textContent)
  
        if(musicResultSearch.searchStatus === 'requestError'){
          console.log("Get Music")
          const newTextSearch = await googleSearch(music.textContent)
  
          console.log(newTextSearch)
  
          if(newTextSearch){
            musicResultSearch.textMusic = newTextSearch.music[0].replace(/(\r\n|\n|\r)/gm, " ")
            musicResultSearch.searchStatus = "GoogleSearch OK"
            musicResultSearch.lang = newTextSearch.lang[0] === 'pt-BR' ? "PT-BR" : "EN-US"
          }
          else {
            musicResultSearch.searchStatus = "GoogleSearch ERROR"
          }
        }
  
  
        if(musicResultSearch.lang === "PT-BR"){
          musicsToSave.push(musicResultSearch)
        }
      }
  
      await generateReport(musicsToSave, link.year)
    }

    return
  
}

run()
