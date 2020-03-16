const mapboxToken = 'pk.eyJ1IjoidGVyZW5jZTE5OTAiLCJhIjoiY2s3dXY3dHBiMWFmZTNlb3VkOTl5ZWJpbSJ9.jcuzjALaagKde10tEYKogA'
const googleToken = 'AIzaSyDERSiSZ1uWvmBtWtGT7AZ7XfbR87Juq2w'
const apiUrl = 'http://covid-mutual.kode.site/api/areas'

let navItems = Array.from(document.querySelectorAll('#nav ul li a'))
let sections = Array.from(document.querySelectorAll('.section'))

makeActive(window.location.hash || '#areas')

let postcode
let cooordsSets = []

const street = document.getElementById('street')
const name = document.getElementById('name')
const list = document.getElementById('areasList')
const form = document.getElementById('coverForm')

navItems.forEach(node => {
  node.addEventListener('click', (e) => makeActive(e.currentTarget.getAttribute('href')))
})

function init() {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    cooordsSets.forEach(async (coordinates, i) => {
      const data = {
        street: street.value,
        postcode: postcode,
        name: name.value,
        coordinates: JSON.stringify(coordinates)
      }
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const json = await res.json()
      console.log(json)
      if((i+1) == cooordsSets.length) {
        postcode = ''
        cooordsSets = []
      }
    })
    form.reset()
  })
  navigator.geolocation.getCurrentPosition(async ({coords}) => {
    const center = [coords.latitude, coords.longitude]
    const circle = new google.maps.Circle({ center: new google.maps.LatLng(coords.latitude, coords.longitude), radius: 5 })
    const autocomplete = new google.maps.places.Autocomplete(street, {
      bounds: circle.getBounds(),
      strictbounds: true,
      types: [
        'address'
      ]
    })
    autocomplete.addListener('place_changed', async () => {
      postcode = ''
      cooordsSets = []
      let places = autocomplete.getPlace()
      let components = places.address_components
      let opPostcode = components.find(comp => comp.types.includes('postal_code'))
      let opStreet = components.find(comp => comp.types.includes('route'))
      if(opStreet && opPostcode) {
        postcode = opPostcode.short_name
        streetName = opStreet.short_name
        console.log(components)
        const opUrl = `https://nominatim.openstreetmap.org/search?q=${streetName} ${postcode}&polygon_geojson=1&format=json`
        const opRes = await fetch(opUrl)
        const results = await opRes.json()
        if(results.length) {
          results.forEach((result, i) => {
            if(result.geojson.type == 'LineString') {
              cooordsSets.push(result.geojson.coordinates)
            }
          })
        } else {
          alert('This is not a street')
          street.value = ''
        }
      } else {
        alert('This is not a street')
        street.value = ''
      }
    })
    try {
      let map = L.map('areasMap').setView(center, 15)
      L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
          attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
          maxZoom: 18,
          id: 'mapbox/streets-v11',
          tileSize: 512,
          zoomOffset: -1,
          accessToken: mapboxToken
      }).addTo(map)
      let areasRes = await fetch(apiUrl)
      let areasJson = await areasRes.json()
      let lines = areasJson.filter(area => area.coordinates)
        .map(area => new Object({
            "type": "LineString",
            "coordinates": JSON.parse(area.coordinates)
        }))
      L.geoJSON(lines, {color: 'red'}).addTo(map)
      areasJson.forEach(area => {
        let listItem = document.createElement('li')
        listItem.innerHTML = `${area.postcode} - ${area.street} - ${area.name}`
        list.appendChild(listItem)
      })
    } catch(err) {
      console.log(err)
      alert(`no results found`)
    }
  })
}

function makeActive(hash) {
  navItems.forEach(node => node.classList.remove('active'))
  sections.forEach(node => node.style.display = 'none')
  let menuItem = document.querySelector(`#nav ul li a[href="${hash}"]`)
  let section = document.querySelector(hash)
  section.style.display = 'block'
  menuItem.classList.add('active')
}
