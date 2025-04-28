// main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import App from './App.jsx'
import './index.css'

const theme = extendTheme({
  colors: {
    consumo:    '#218C4C',
    generacion: '#F66A00',
    almacen:    '#114E83',
    mercado:    '#1F4E79',
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body:    'Inter, sans-serif',
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
)
