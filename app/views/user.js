const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const User = {
    props:['id'],
    mounted: function(){
        const userData = store.get('userData');
        if(userData.user_profile.user_id == this.id || !this.id){
            this.isMe = true;
            return this.getMe();
        }else{
            return this.getUser();
        }
    },
    data:function(){
        return {
            user: null,
            isMe: false,
            loading:true
        };
    },
    methods:{
        getUser: async function(){
            const userData = store.get('userData');
            this.loading = true;
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.getUser(profile,parseInt(this.id));
            console.log(result);
            if(result.success){
                this.user = result;
                this.loading = false;
            }
            else{
                console.error(result);
                const notif = new Notification('Failed', {
                    body: result.error_message
                });
            }
        },
        getMe: async function(){
            const userData = store.get('userData');
            this.loading = true;
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.getUser(profile,parseInt(userData.user_profile.user_id));
            console.log(result);
            if(result.success){
                this.user = result;
                this.loading = false;
            }
            else{
                console.error(result);
                const notif = new Notification('Failed', {
                    body: result.error_message
                });
            }
        },
        follow:async function(){
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };

            const result = await ClubHouseApi.api.followUser(profile,parseInt(this.id));
            console.log('follow');
            console.log(result);
            if(result.success){
                this.$set(this.user,'user_profile',{...this.user.user_profile,notification_type:2});
            }else{
                console.error(result);
            }
        },
        unfollow:async function(){
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.unfollowUser(profile,parseInt(this.id));
            console.log('unfollow');
            console.log(result);
            if(result.success){
                this.$set(this.user,'user_profile',{...this.user.user_profile,notification_type:null});
            }else{
                console.error(result);
            }
        },
        enlargeImg: function(){
            const enlargedWrapper = document.createElement('div');
            enlargedWrapper.id = "enlarged";
            const enlargedImg = document.createElement('img');
            enlargedImg.src = this.user.user_profile.photo_url;
            enlargedWrapper.appendChild(enlargedImg);
            enlargedWrapper.addEventListener('click',function(e){
                e.preventDefault();
                this.remove();
            });
            document.body.append(enlargedWrapper);
        }
    },
    watch: {
        '$route.params': {
            handler(newValue) {
                const userData = store.get('userData');
                const { id } = newValue
                
                if(!this.loading){
                    if(id === userData.user_profile.user_id || !id){
                        this.getMe();
                    }else{
                        this.getUser(id);
                    }
                }
            },
            immediate: true,
        }
    },
    template: `
    <div>
        <div class="loading mt-5" v-if="loading"><div></div><div></div><div></div><div></div></div>
        <div v-if="!loading" class="user-page center justify-content-start">
            <div class="card p-4 my-5 max-width-500 mt-5 mx-auto">
                <div class="d-flex align-items-center justify-content-between">
                    <span class="text-muted cursor-pointer" @click="$router.go(-1)">Go Back</span>
                    <div class="d-flex align-items-center justify-content-end">
                        <i class="far fa-home text-muted cursor-pointer" @click="$router.replace('/')"></i>
                    </div>
                </div>
                <div class="d-flex align-items-center justify-content-center flex-column" v-if="user">
                    <div class="user-page-img-outer has-badge">
                        <em v-if="user.user_profile.follows_me" class="badge follow-badge">Follows You</em>
                        <div class="user-page-img" @click="enlargeImg">
                            <img :src="user.user_profile.photo_url" />
                        </div>
                    </div>
                    <h1 class="h5 mb-0 mt-3">{{user.user_profile.name}}</h1>
                    <small class="text-muted">@{{user.user_profile.username}}</small>
                    <small class="text-muted">Joined At: {{new Date(user.user_profile.time_created).toDateString()}}</small>
                    <button class="btn-primary mt-3" @click="follow" v-if="!isMe && !user.user_profile.notification_type">Follow</button>
                    <button class="btn-primary mt-3" @click="unfollow" v-if="!isMe && user.user_profile.notification_type === 2">Unfollow</button>
                    <small class="text-muted mt-2" v-if="user.user_profile.mutual_follows.length">Followed By {{user.user_profile.mutual_follows.reduce((p1,p2) => [...p1,p2.name],[]).join(', ')}}</small>
                    <div class="d-flex align-items-center justify-content-center mt-3">
                        <router-link :to="{name:'userlist',params:{id:user.user_profile.user_id,type:'followers'}}" class="mr-3 cursor-pointer color-dark">{{user.user_profile.num_followers}} Followers</router-link>
                        <router-link :to="{name:'userlist',params:{id:user.user_profile.user_id,type:'followings'}}" class="cursor-pointer color-dark">{{user.user_profile.num_following}} Followings</router-link>
                    </div>
                    <div class="mt-2 pt-1 border-top w-100" v-if="user.user_profile.invited_by_user_profile">
                        <small class="text-muted">Nominated By:</small>
                        <router-link :to="{name:'user',params:{id:user.user_profile.invited_by_user_profile.user_id}}" class="invited-by mt-2">
                            <div class="user-img">
                                <img :src="user.user_profile.invited_by_user_profile.photo_url" alt=""/>
                            </div>
                            <div class="user-details">
                                <strong>{{user.user_profile.invited_by_user_profile.name}}</strong>
                                <small>@{{user.user_profile.invited_by_user_profile.username}}</small>
                            </div>
                        </router-link>
                    </div>
                    <pre class="mt-2 border-top pt-3 w-100">{{user.user_profile.bio}}</pre>
                </div>
            </div>
        </div>
    </div>
    `
}

export default User;