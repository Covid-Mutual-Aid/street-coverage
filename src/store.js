import { writable } from 'svelte/store'

export const store = writable({
	activeTab: window.location.hash ? window.location.hash.substr(1) : 'areas'
})