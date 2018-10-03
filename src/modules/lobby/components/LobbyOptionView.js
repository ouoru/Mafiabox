import React, { Component } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    Dimensions,
}   from 'react-native';
import { connect } from 'react-redux'
import { leaveLobby, startPregame } from '../LobbyReducer'
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Styler } from '@common';

const { color } = Styler
const { height, width } = Dimensions.get('window')

class LobbyOptionView extends Component {

    _toggleMenu = () => {
        
    }

    render(){
        const { owner, leaveLobby, startPregame } = this.props
        return (
            <View style = { styles.container }>
        
                <TouchableOpacity
                    style = {{alignItems:'center', flex:0.17}}
                    onPress = {leaveLobby}>
                    <FontAwesome name='close'
                        style={{color:color.font, fontSize:25}}/>
                    <Text style = {styles.font}>Leave</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style = {{alignItems:'center', flex:0.20}}
                    onPress = {startPregame}
                    disabled = {!owner}
                >
                    <FontAwesome name={owner?'check':'lock'}
                        style={{color:owner?color.font:color.dead, fontSize:35}}/>
                    <Text style = {[styles.font,{color:owner?color.font:color.dead}]}>Start</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style = {{alignItems:'center', flex:0.17}}
                >
                    <FontAwesome name='bars'
                        style={{color:color.font, fontSize:25}}/>
                    <Text style = {styles.font}>Roles</Text>
                </TouchableOpacity>

            </View>
        )
    }
}

const styles = {
    container:{
        height: height*0.1,
        width,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF'
    },
    font: {
        fontFamily: 'FredokaOne-Regular',
        textAlign:'center',
        color: color.font,
    },
}

export default connect(
    state => ({
        owner: state.lobby.config.owner
    }),
    dispatch => {
        return {
            leaveLobby: () => dispatch(leaveLobby()),
            startPregame: () => dispatch(startPregame())
        }
    }
)(LobbyOptionView)