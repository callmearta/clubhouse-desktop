`use strict`;
const VueRouter = require('vue-router');
const Vue = require('vue/dist/vue.js');
const VueToaster = require('vue-toastr');
const store = require('store');
const ClubHouseApi = require('clubhouse-api');
const ua = require('universal-analytics');

import Login from './views/login.js';
import Home from './views/home.js';
import Verify from './views/verify.js';
import Event from './views/event.js';
import Channel from './views/channel.js';
import Waitlist from './views/waitlist.js';
import User from './views/user.js';
import UserList from './views/userlist.js';
import EditProfile from './views/editProfile.js';
import Notifications from './views/notifications.js';
import Club from './views/club.js';

import UserComponent from './components/user.js';
import UserHComponent from './components/user-h.js';
import ChannelHComponent from './components/channel-h.js';
import LoadingComponent from './components/loading.js';

Vue.use(VueRouter);
Vue.use(VueToaster);

Vue.component('user',UserComponent);
Vue.component('user-h',UserHComponent);
Vue.component('channel-h',ChannelHComponent);
Vue.component('loading',LoadingComponent);


Vue.config.productionTip = false;

const routes = [
  { 
    path:'/', 
    component: Login,
    name: 'login'
  },
  { 
    path:'/home',
    component:Home ,
    name: 'home'
  },
  {
    path:'/verify',
    component:Verify,
    name:'verify',
    props:true
  },
  {
    path:'/event/:eventId',
    component:Event,
    name:'event',
    props:true
  },
  {
    path:'/channel/:name',
    component:Channel,
    name:'channel',
    props:true
  },
  {
    path:'/waitlist',
    component: Waitlist,
    name:'waitlist',
  },
  {
    path: '/me',
    component: User,
    name: 'me',
    props: true
  },
  {
    path: '/user/:id',
    component: User,
    name: 'user',
    props:true
  },
  {
    path: '/user/:id/:type',
    component: UserList,
    name: 'userlist',
    props:true
  },
  {
    path: '/search/:q',
    component: UserList,
    name: 'search',
    props:true
  },
  {
    path: '/profile/edit',
    component: EditProfile,
    name: 'editProfile'
  },
  {
    path: '/notifications',
    component: Notifications,
    name: 'notifications'
  },
  {
    path: '/club/:id',
    component: Club,
    name: 'club',
    props: true
  }
]
const router = new VueRouter({
  routes
})

const app = new Vue({
  mounted:function(){
    document.oncontextmenu = function() {
      return false;
    }
    const settings = store.get('settings');
    if(!settings){
      store.set('settings',{
        filterEastern: true,
        filterRooms: []
      });
    }
    const userData = store.get('userData');
    if(userData && userData.user_profile.user_id){
      var visitor = ua('UA-191723723-1', ''+userData.user_profile.user_id, {uid:''+userData.user_profile.user_id,strictCidFormat: false});
      visitor.pageview("/").send();
    }else{
      var visitor = ua('UA-191723723-1');
      visitor.pageview("/").send();
    }
    if(userData && userData.is_verified){
      this.refreshToken();
    }
  },
  methods: {
    refreshToken: async function(){
      const userData = store.get('userData');
      const profile = {
        ...ClubHouseApi.profiles.application.a304,
        ...ClubHouseApi.profiles.locales.English,
      };
      const result = await ClubHouseApi.api.refreshToken(profile,userData.refresh_token);
      console.log(result);
      if(result){
        store.set('userData',{...userData,refresh_token: result.refresh,access_token:result.access});
      }else{
        console.error(result);
      }
    }
  },
  router
}).$mount('#app')