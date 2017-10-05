
import React from 'react';
import {
    View,
    Image,
    AsyncStorage,
    BackHandler,
    Text,
    ListView,
    FlatList,
}   from 'react-native';

import { StackNavigator } from 'react-navigation';
import { NavigationActions } from 'react-navigation';

import { Button, List, ListItem, Avatar } from "react-native-elements";
import ProfileButton from '../components/ProfileButton.js';
import { onSignOut } from "../auth";

//Firebase
import firebase from '../firebase/FirebaseController.js';

export default class ProfileScreen extends React.Component {

static navigationOptions = {
  headerTitle: 'Profile',
  headerTintColor: 'white',
  headerStyle: {
      backgroundColor: 'black',
  }
}

  constructor(props) {
    super(props);
    
    const dataSource = new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2,
    });

    this.state = {

      role: '',
      description: '',

      roomname:'',
      messages: dataSource,

    }
    this.userRef = firebase.database().ref('users/' + firebase.auth().currentUser.uid + '/room');
    this.msgRef = firebase.database().ref('messages/' + firebase.auth().currentUser.uid);
  }

componentWillMount() {
    this.userRef.on('value',snap=>{

        firebase.database().ref('rooms/' + snap.val().name + '/listofplayers/' 
            + firebase.auth().currentUser.uid).once('value',status=> {

              if(snap.val().phase > 1){

                  firebase.database().ref('rules/' + status.val().roleid).once('value',rolesnap=>{

                      this.setState({
                          role: rolesnap.val().name,
                          description: rolesnap.val().desc,
                      })
                  })

              } else {
                  this.setState({
                      role:'None',
                      description: 'There is no Active Game.',
                  })
              }
        })
    })

    this.msgRef.on('value',snap=>{
        var msg = [];
            snap.forEach((child)=>{
                if(child.key != 'count'){     
                    msg.push({
                        from: child.val().from,
                        color: child.val().color,
                        message: child.val().message,
                        key:child.key,
                    })
                }
            })
            this.setState({messages:msg})
    })
}

componentWillUnmount() {

    if(this.userRef){
      this.userRef.off();
    }
    if(this.msgRef){
      this.msgRef.off();
    }
}

  render(){
    return <View style={{
              flex: 1,
              backgroundColor: 'white',
          }}>

              <View style = {{flex:0.2}}/>

              <View style = {{flex:0.6,borderWidth:1, alignItems: 'center',justifyContent:'center'}}>
                  <Text>My Role:</Text>
                  <Text style={{fontWeight:'bold',fontSize:20}}>{this.state.role}</Text>
              </View>

              <View style = {{flex:0.8}}/>

              <View style = {{flex:0.5,borderWidth:1, alignItems: 'center',justifyContent:'center'}}>
                  <Text>{this.state.description}</Text>
              </View>

              <View style = {{flex:0.9}}/>

              <View style = {{
                  flex: 2,
                  borderWidth: 1,
                }}>
                <View><FlatList
                    data={this.state.messages}
                    renderItem={({item}) => (
                        <View style = {{flexDirection:'row',marginLeft:15,}}>
                          <Text style={{color:'black',fontWeight:'bold'}}>{'[ ' + item.from + ' ] '}</Text> 
                          <Text style={{color:item.color,fontWeight:'bold'}}>{item.message}</Text></View>
                    )}
                    keyExtractor={item => item.key}
                /></View>
              </View>

              <View style = {{
                flex: 0.7,
                flexDirection: 'row',
                backgroundColor: 'white',
              }}>
                <View style = {{
                  flex: 1,
                  margin: 5,
                  justifyContent:'center',
                }}>
                  <ProfileButton title="Leave Game" 
                    icon={{name: 'do-not-disturb', size: 16}}
                    color='white'
                    onPress={() => {
                      firebase.database().ref('users/' + firebase.auth().currentUser.uid + '/room')
                        .update({name: null, phase:1})
                      this.props.navigation.navigate('Room_Screen')
                    }}/>
                </View>

                <View style = {{
                  flex:1,
                  margin: 5,
                  justifyContent:'center',
                }}>
                  <ProfileButton
                    title="Log Out"
                    color='white'
                    icon={{name: 'subdirectory-arrow-left', size: 16}}
                    onPress={() => {
                      this.props.navigation.navigate('SignedOut');
                    
                      onSignOut().then(() => {
                        firebase.auth().signOut();
                      }) 
                  }}/>
                </View>
            </View>
    </View>
}};
