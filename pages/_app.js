import '../css/global.css'

import { Web3ReactProvider } from '@web3-react/core'
import Web3 from 'web3'
import Head from 'next/head'
import Navbar from '../components/Navbar'

function getLibrary(provider) {
    return new Web3(provider)
}

export default function MyApp({ Component, pageProps }) {
    return <Web3ReactProvider getLibrary={getLibrary}>
        <Head>
            <title>SD App</title>
            <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className='bg-black'>
            <Navbar />
            <Component {...pageProps} />
        </div>
    </Web3ReactProvider>
}