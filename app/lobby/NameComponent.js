
import React, { Component } from 'react';
import {
    TextInput,
    View,
    TouchableOpacity,
    Dimensions,
}   from 'react-native';

import FontAwesome from 'react-native-vector-icons/FontAwesome';

import firebaseService from '../firebase/firebaseService.js';

import colors from '../misc/colors.js';

const allowedChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ';
const maxCharLen = 12;

class NameComponent extends Component {
    
    constructor(props) {
        super(props);

        this.state = {
            name:null
        }

        this.invalidChars = []
        this.infoRef = null

        this.width = Dimensions.get('window').width
        this.height = Dimensions.get('window').height
    }

    componentWillMount() {

        //import all listeners
        const { myInfoRef } = firebaseService.fetchLobbyListeners()

        this.infoRef = myInfoRef
        
        this.infoRef.on('value',snap=>{
            if(snap.exists()){
                this.setState({
                    name: snap.val().name
                })
            }
        })

    }

    componentWillUnmount(){
        if(this.infoRef) this.infoRef.off()
    }

    onChange(name){
        this.setState({
            name:name
        })
    }

    checkName(name){

        this.invalidChars = []

        if(!name){
            //must give a name
            return
        } 
        
        if(name.length > maxCharLen){
            //too long
            return
        }

        for(var i=0; i<name.length; i++){

            var isCharValid = false

            for(var j=0; j<allowedChars.length; j++){

                if(name.charAt(i) === allowedChars.charAt(j)) {

                    isCharValid = true
                    break

                }

            }

            if(!isCharValid){
                this.invalidChars.push( name.charAt(i) )
            }

        }

        if(this.invalidChars.length > 0){

            alert('not a valid name.')
            return

        } else {

            firebaseService.updateUsername(name)
            
        }
        
    }

    render() {
        return <View style = {{height:this.height*0.1,flexDirection:'row'}}>

            <View style = {{width:45}}/>

            <TextInput
                ref = 'alias'
                keyboardType='default'
                autoCapitalize='words'
                value = {this.state.name}
                placeholder='Nickname'
                placeholderTextColor={colors.dead}
                maxLength={maxCharLen}
                style={[styles.nameInput,{width:this.width*0.4}]}
                onChangeText = { (text) => this.onChange(text) }
                onSubmitEditing = { (event) => this.checkName(event.nativeEvent.text.trim()) }
            />

            <TouchableOpacity
                style = {{alignItems:'center', justifyContent:'center', width:45}}
                onPress = {()=> this.refs.alias.focus() }>
                <FontAwesome name='pencil'
                    style={{color:colors.font, fontSize:30}}/>
            </TouchableOpacity>

        </View>
    }
}

const styles = {
    nameInput: {
        fontFamily:'FredokaOne-Regular',
        fontSize: 18,
        color:colors.font,
        textAlign:'center',
        justifyContent:'center',
    },
}

export default NameComponent