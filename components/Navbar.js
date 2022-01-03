import Link from 'next/link';
import React, { useState } from 'react';
import { BtnWallet } from './BtnWallet';

const menu = [
    {
        title: 'My tokens',
        id: 'tokens',
        url: '/'
    },
    {
        title: 'Bonds',
        id: 'bonds',
        url: '/bonds'
    },
    {
        title: 'Solana Staking',
        id: 'solanastaking',
        url: '/solanastaking'
    }
];

const DEFAULT = "tokens";

export default class NavBar extends React.Component {
    state = {
        id: DEFAULT,
    };

    componentDidMount() {
        const urls = window.location.href.split("/");
        this.setState({ id: urls[urls.length - 1] || DEFAULT });
    }

    handleMenu = (id) => this.setState({ id });

    render() {
        return (
            <nav className='flex flex-row items-center justify-center pt-5'>
                {
                    menu.map(link => {
                        let style = 'text-3sm text-white mx-8 cursor-pointer hover:underline underline-offset-8';
                        if (link.id === this.state.id) {
                            style += " underline";
                        }
                        return <Link href={link.url} key={link.id}>
                            <p className={style} onClick={() => this.handleMenu(link.id)}>{link.title}</p>
                        </Link>;
                    })
                }
                <BtnWallet />
            </nav>
        )
    }
}