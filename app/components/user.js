const Vue = require('vue/dist/vue.js');
const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const user = Vue.component('user',{
    props:['user','isModerator','channel','isSpeaker'],
    data:function(){
        return{
            dropdownOpen: false,
            speakerDropdown: false
        }
    },
    methods:{
        openDropdown: function(){
            if(this.dropdownOpen){
                this.dropdownOpen = false
            }else{
                this.dropdownOpen = true;
            }
        },
        handleClick: function(){
            const userData = store.get('userData');
            if(this.isModerator){
                this.openDropdown();
            }
            else if(this.isSpeaker && this.user.user_id === userData.user_profile.user_id){
                this.speakerDropdown = !this.speakerDropdown;
            }
            else{
                this.$router.push({name:'user',params:{id:this.user.user_id}});
            }
        },
        inviteSpeaker: async function(){
            this.dropdownOpen = false;
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.inviteSpeaker(profile,this.channel,this.user.user_id);
            console.log(result);
            if(result.success){

            }else{
                new Notification('Failed',{
                    body: result.error_message
                });
            }
        },
        uninviteSpeaker: async function(){
            this.dropdownOpen = false;
            this.speakerDropdown = false;
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.uninviteSpeaker(profile,this.channel,this.user.user_id);
            console.log(result);
            if(result.success){

            }else{
                new Notification('Failed',{
                    body: result.error_message
                });
            }
        },
        makeModerator: async function(){
            this.dropdownOpen = false;
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.makeModerator(profile,this.channel,this.user.user_id);
            console.log(result);
            if(result.success){

            }else{
                new Notification('Failed',{
                    body: result.error_message
                });
            }
        },
        viewProfile: function(){
            this.dropdownOpen = false;
            this.$router.push({name:'user',params:{id:this.user.user_id}});
        },
        banUser: async function(){
            this.dropdownOpen = false;
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.blockFromChannel(profile,this.channel,this.user.user_id);
            console.log(result);
            if(result.success){

            }else{
                new Notification('Failed',{
                    body: result.error_message
                });
            }
        },
        muteSpeaker: async function(){
            this.dropdownOpen = false;
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.muteSpeaker(profile,this.channel,this.user.user_id);
            console.log(result);
            if(result.success){

            }else{
                new Notification('Failed',{
                    body: result.error_message
                });
            }
        }
    },
    template:`
        <div v-bind:class="{user:true, isSpeaking: (user.is_speaker || user.is_moderator) && user.speaking }" :key="user.user_id">
            <div class="user-img" :style="user.volumeLevel ? {'border-width': Math.min(user.volumeLevel,10)+'px'} : null" @click="handleClick">
                <img :src="user.photo_url" />
                <div class="mute" v-if="(user.is_speaker || user.is_moderator) && !user.unmute">
                    <img :src="'assets/images/mute.png'" height="16" />
                </div>
            </div>
            <strong><span v-if="user.is_moderator" class="isModerator">*</span>{{user.first_name}}</strong>
            <small>@{{user.username}}</small>
            <div class="user-dropdown" v-if="dropdownOpen">
                <a @click="viewProfile">View Profile</a>
                <a @click="inviteSpeaker" v-if="!user.is_speaker">Make Speaker</a>
                <a @click="uninviteSpeaker" v-if="user.is_speaker || user.is_moderator">Remove Speaker</a>
                <a @click="muteSpeaker" v-if="user.is_speaker">Mute Speaker</a>
                <a @click="makeModerator" v-if="user.is_speaker && !user.is_moderator">Make Moderator</a>
                <a @click="banUser" class="text-danger">Ban User</a>
            </div>
            <div class="user-dropdown" v-if="speakerDropdown">
                <a @click="viewProfile">View Profile</a>
                <a @click="uninviteSpeaker" v-if="user.is_speaker || user.is_moderator">Remove Speaker</a>
            </div>
        </div>
    `
});

export default user;