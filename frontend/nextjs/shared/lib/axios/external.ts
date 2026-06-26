import axios from 'axios'

export const externalApi = axios.create({
  baseURL: 'https://open-api.example.com',
  timeout: 10000
})
