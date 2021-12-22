import Link from 'next/link';
import { useState } from 'react';
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
    }
]

export const Navbar = () => {
    const [id, setId] = useState("tokens");

    const handleMenu = id => setId(id);

    return (
        <nav className='flex flex-row items-center justify-center pt-5'>
            {
                menu.map(link => {
                    let style = 'text-3sm text-white mx-8 cursor-pointer hover:underline underline-offset-8';
                    if (link.id === id) {
                        style += " underline";
                    }
                    return <Link href={link.url} key={link.id}>
                        <p className={style} onClick={() => handleMenu(link.id)}>{link.title}</p>
                    </Link>;
                })
            }
            <BtnWallet />
        </nav>
    )
}