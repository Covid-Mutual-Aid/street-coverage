<main bind:this={main}>
	<div class="content">
		<header>
			<img src="logo.png" class="logo" alt="logo">
			<nav>
				<ul>
			        <li>
			          <a href="#areas" class:active={$store.activeTab == 'areas'} on:click="{() => { $store.activeTab = 'areas'; refreshMap() }}">Streets Leafleted (Map)</a>
			        </li>
			        <li>
			        	<a href="#list" class:active={$store.activeTab == 'list'} on:click="{() => $store.activeTab = 'list'}">Streets Leafleted (List)</a>
			        </li>
			        <li>
			        	<a href="#cover" class:active={$store.activeTab == 'cover'} on:click="{() => $store.activeTab = 'cover'}">Leaflet Your Street</a>
			        </li>
		      	</ul>
			</nav>
		</header>
		
		<div class="section" class:active={$store.activeTab == 'cover'}>
			<h1>Let us know the streets you have leafleted</h1>
			<p>When you have leafleted a street, please complete this form and the map and list will be updated.</p>
			<p>You will essentially be responsible for the street you have leafleted, if you get overwhelmed with requests for help, let us know.</p>
			<form on:submit={sendArea}>
				<div class="field">
					<label for="street">Street Name <sup>*</sup></label>
					<input type="text" placeholder="High Steet, London" required bind:this={streetInput} />
				</div>
				<div class="field">
					<label for="name">Your Name or Initial (if you're happy to provide)</label>
					<input type="text" placeholder="Joe Bloggs" bind:value={name} />
				</div>
				<button>Submit</button>
			</form>
	    </div>
	    <div class="section" class:active={$store.activeTab == 'areas'}>
	    	<h1>Streets Leafleted</h1>
			<p>Find out if your street has been leafleted in the map below.</p>
			<div bind:this={mapContainer} class="map" class:unconfirmed={unconfirmed} on:click={triggerNavigator}>
				{#if loading}
					<span>Loading Map</span>
				{:else}
					<span>Please let us know your location by clicking "Allow" on the prompt above to see the map. If you cannot see the prompt click on this box.</span>
				{/if}
			</div>
	    </div>
	    <div class="section" class:active={$store.activeTab == 'list'}>
	    	<h1>Streets Leafleted</h1>
			<p>Find out if your street has been leafleted in the list below.</p>
			<ul>
				{#each areas as area}
					<li>{area.postcode} - {area.street} - {area.name}</li>
				{/each}
			</ul>
	    </div>
	</div>
</main>

<script>

	import { store } from './store';
	import { onMount } from 'svelte';
	
	let mapContainer
	let streetInput
	let name
	let main
	
	let unconfirmed = true
	let loading = false
	
	$: areas = []
	
	let map
	let cooordsSets = []
	let postcode
	let streetName
	
	const apiUrl = '/api/areas'
	const mapboxToken = 'pk.eyJ1IjoidGVyZW5jZTE5OTAiLCJhIjoiY2s3dXY3dHBiMWFmZTNlb3VkOTl5ZWJpbSJ9.jcuzjALaagKde10tEYKogA'
	
	const sendArea = (e) => {
		e.preventDefault()
		const form = e.currentTarget
	    cooordsSets.forEach(async (coordinates, i) => {
			const data = {
				street: streetName,
				postcode,
				name,
				coordinates: JSON.stringify(coordinates)
			}
			const res = await fetch(apiUrl, {
				method: 'POST',
				body: JSON.stringify(data),
				headers: {
					'Content-Type': 'application/json'
				}
			})
			if(res.ok) {
				const json = await res.json()
				L.geoJSON([
					{
						"type": "LineString",
						coordinates
					}
				], {color: 'red'}).addTo(map)
				if((i+1) == cooordsSets.length) {
					areas = areas.concat([data])
					vanillaToast.success(`Thanks for helping out in ${streetName}, ${postcode}`)
					postcode = ''
					streetName = ''
					cooordsSets = []
					form.reset()
					store.update(state => new Object({...state, activeTab: 'areas'}))
					window.location.hash = '#areas'
					refreshMap()
				}
			} else {
				vanillaToast.error('Something went wrong please try again')
				return false
			}
	    })
	}
	
	let center
	const refreshMap = () => {
		window.dispatchEvent(new Event('resize'))
	}
	
	const requestOs = async (latLng, locality, town, postcode) => {
		
		let snippet = ''
		if(locality) {
			snippet += `, ${locality}`
		}
		if(town) {
			snippet += `,${town}`
		}
		if(postcode) {
			snippet += `, ${postcode}`
		}
        const q = `${streetName}, ${latLng}${snippet}`
        const opUrl = `https://nominatim.openstreetmap.org/search?q=${q}&polygon_geojson=1&format=json`
        const opRes = await fetch(opUrl)
        const results = await opRes.json()
        
        return results  
		
	}
	
	const updateCoords = (results, locality, town, postcode) => {
		results.forEach((result, i) => {
			if(result.geojson.type == 'LineString') {
				if(
					postcode && result.display_name.includes(postcode) ||
					locality && result.display_name.includes(locality) ||
					town && result.display_name.includes(town)
				) {
					cooordsSets.push(result.geojson.coordinates)	
				}
			}
		})
	}
	
	const triggerNavigator = () => {
		if(unconfirmed) {
			navigator.geolocation.getCurrentPosition(async ({coords}) => {
				loading = true
			    center = [coords.latitude, coords.longitude]
			    const circle = new google.maps.Circle({ center: new google.maps.LatLng(coords.latitude, coords.longitude), radius: 5 })
			    const autocomplete = new google.maps.places.Autocomplete(streetInput, {
			      bounds: circle.getBounds(),
			      strictbounds: true,
			      types: [
			        'address'
			      ]
			    })
			    autocomplete.addListener('place_changed', async () => {
			      postcode = ''
			      streetName = ''
			      cooordsSets = []
			      let place = autocomplete.getPlace()
			      let latLng = `[${place.geometry.location.lat()}, ${place.geometry.location.lng()}]`
			      let components = place.address_components
			      let opPostcode = components.find(comp => comp.types.includes('postal_code'))
			      let opStreet = components.find(comp => comp.types.includes('route'))
			      let opLocality = components.find(comp => comp.types.includes('locality'))
			      let opTown = components.find(comp => comp.types.includes('postal_town'))
			      if(opStreet && (opPostcode || opLocality || opTown)) {
			        streetName = opStreet.long_name
			        postcode = opPostcode ? opPostcode.short_name : null
			        const locality = opLocality ? opLocality.long_name : null
			        const town = opTown ? opTown.long_name : null
			        let results = await requestOs(latLng, locality, town, postcode)
			        if(results.length) {
				      updateCoords(results, locality, town, postcode)
			        } else {	
				        results = await requestOs(latLng, locality, town)	
				        if(results.length) {
					      updateCoords(results, locality, town, postcode)
				        } else {
					        results = await requestOs(latLng, locality)
					        if(results.length) {
						      updateCoords(results, locality, town, postcode)
					        } else {
								vanillaToast.error('This street is not within a 2 mile radius of you')
								streetInput.value = ''
							}
						}
			        }
			      } else {
					vanillaToast.error('This is not a street')
					streetInput.value = ''
			      }
			    })
			    try {
				    map = L.map(mapContainer)
				    map.setView(center, 15)
					L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
						attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
						maxZoom: 18,
						id: 'mapbox/streets-v11',
						tileSize: 512,
						zoomOffset: -1,
						accessToken: mapboxToken
					}).addTo(map)
				    let areasRes = await fetch(`${apiUrl}?type=list`)
					areas = await areasRes.json()
					L.geoJSON(areas.map(area => new Object({
						"type": "LineString",
						"coordinates": JSON.parse(area.coordinates)
					})), {color: '#b169e5'}).addTo(map)
					refreshMap()
					unconfirmed = false
			    } catch(err) {
			      vanillaToast.error(`no results found`)
			    }
			})	
		}
	}
	
	onMount(() => {
		
		main.style.setProperty(
	      "--vh",
	      `${window.innerHeight}px`
	    )
	
		triggerNavigator()
		
	})
	
</script>

<style>
	:global(body) {
		background: #1a1a1a;
		padding: 1.25rem;
		color: #1a1a1a;
		font-family: Merriweather, Georgia, serif;
		font-size: 16px;
		font-size: 1rem;
		line-height: 1.75;
	}
	:global(#vanilla-toast-container) {
		z-index: 999;
	}
	main {
		margin: 0 auto;
		background-color: white;
		height: calc( var(--vh) - 2.5rem ); 
		overflow-y: auto;
	}
	.content {
		margin: 0 auto;
		max-width: 1200px;
		padding: 5rem 2rem;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 3rem;
	}
	nav {
		display: flex;
		justify-content: flex-end;
	}
	nav ul {
		list-style: none;
		display: flex;
		padding: 0;
		margin: 0;
	}
	nav ul li a {
		color: #1a1a1a;
	    display: block;
	    line-height: 1.3125;
	    outline-offset: -8px;
		padding: 0.65625em 0.875em;
		white-space: nowrap;
		font-weight: 400;
		outline: none;
		font-family: Montserrat, "Helvetica Neue", sans-serif;
	}
	nav ul li a:hover {
		text-decoration: none;
		color: #007acc;
	}
	nav ul li a.active {
		font-weight: 700;
	}
	.section {
		display: none;
	}
	.section.active {
		display: block;
	}
	.map {
		height: 500px;
	}
	.map.unconfirmed {
		background-color: #f2f2f2;
		display: flex;
		align-items: center;
		justify-content: center;
		color: black;
		padding: 2rem;
	}
	.banner {
		margin-bottom: 4rem;
	}
	.logo {
		width: 300px;
	}
	h1 {
		color: black;
		font-family: Montserrat, "Helvetica Neue", sans-serif;
	}
	.field {
		margin-bottom: 1.5rem;
	}
	input[type="text"] {
		min-width: 18rem;
		width: 30%;
		border-radius: 1rem;
		padding: .75rem 1.5rem;
		outline: none;
	}
	button {
		background-color: #69E1E6;
		color: black;
		border-radius: 1rem;
		border: none;
		padding: .75rem 1.5rem;
		cursor: pointer;
	}
	
	@media only screen and (max-width: 768px) {
		.content {
			padding: 3rem 2rem;
		}
		header {
			flex-direction: column;
			text-align: center;
		}
		.logo {
			width: 100%;
			margin-bottom: 1.5rem;
		}
	}
	@media only screen and (max-width: 414px) {
		.content {
			padding: 2rem;
		}
		nav ul {
			flex-direction: column;
			text-align: center;
		}
	}
</style>