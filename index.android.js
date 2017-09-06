import React, { Component } from 'react';

import Signup from './app/pages/signup.js';
import DrawerExample from './app/App.js';
import { AppRegistry } from 'react-native';

import { createRootNavigator } from "./router";
import { isSignedIn } from "./app/auth";

export default class App extends React.Component {

    render(){
        const { checkedSignIn, signedIn } = this.state;
        
        // If we haven't checked AsyncStorage yet, don't render anything (better ways to do this)
        if (!checkedSignIn) {
            return null;
        }
    
        const Layout = createRootNavigator(signedIn);
        return <Layout />;
    }
}

AppRegistry.registerComponent('Huddle', () => App);