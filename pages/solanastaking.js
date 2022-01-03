
import React from 'react';
import { getPhantomProvider, isPhantomConnected } from '../tools/phantom/phantom';

export default class Bonds extends React.Component {

    state = {
        isConnected: false,
    };

    componentDidMount() {
        const provider = getPhantomProvider();
        if (provider) {
            window.solana.on("connect", this.handleConnect);
            window.solana.on('disconnect', this.handleConnect);

            this.setState({ isConnected: isPhantomConnected() });
        }
    }

    handleConnect = () => this.setState({ isConnected: isPhantomConnected() });

    render() {
        const provider = getPhantomProvider();
        if (!provider) {
            return <div className="flex flex-row items-center justify-center mt-8">
                <p>Phantom wallet not detected, please install it</p>
            </div>
        }

        if (!this.state.isConnected) {
            return <div className="flex flex-row items-center justify-center mt-8">
                <p>Phantom wallet not connected</p>
            </div>
        }

        return (
            <div className="flex flex-row items-center justify-center mt-8">

            </div>
        )
    }
}