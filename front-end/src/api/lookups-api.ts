import type {
  CategoryLookup,
  ChannelLookup,
  CityLookup,
  GetCategoriesResponse,
  GetChannelsResponse,
  GetCitiesResponse,
} from '../types/lookups-types'

const API_URL = 'http://88.200.63.148:30033'

export async function fetch_categories(): Promise<CategoryLookup[]> {
  const response = await fetch(`${API_URL}/api/lookups/categories`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load categories: ${response.status}`)
  }

  const json: GetCategoriesResponse = await response.json()

  if (!json.success) {
    throw new Error('Backend returned error for categories')
  }

  return json.data
}

export async function fetch_channels(): Promise<ChannelLookup[]> {
  const response = await fetch(`${API_URL}/api/lookups/channels`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load channels: ${response.status}`)
  }

  const json: GetChannelsResponse = await response.json()

  if (!json.success) {
    throw new Error('Backend returned error for channels')
  }

  return json.data
}

export async function fetch_cities(): Promise<CityLookup[]> {
  const response = await fetch(`${API_URL}/api/lookups/cities`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load cities: ${response.status}`)
  }

  const json: GetCitiesResponse = await response.json()

  if (!json.success) {
    throw new Error('Backend returned error for cities')
  }

  return json.data
}