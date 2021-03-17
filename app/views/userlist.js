const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const UserList = {
    props:['id','type','q'],
    data:function(){
        return{
            users: [],
            loading:true,
            searchQuery: this.q || ''
        }
    },
    mounted: function(){
        if(this.type == 'followers'){
            return this.getFollowers();
        }
        if(this.type == 'followings'){
            this.getFollowings();
        }
        if(this.q){
            this.getSearch();
        }
    },
    methods:{
        getFollowers:async function(){
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.getFollowers(profile,parseInt(this.id));
            console.log(result);
            if(result.success){
                this.users = result.users;
                this.loading = false;
            }else{
                new Notification('Failed',{
                    body: 'Failed'
                });
            }
        },
        getFollowings:async function(){
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.getFollowing(profile,parseInt(this.id));
            console.log(result);
            if(result.success){
                this.users = result.users;
                this.loading = false;
            }else{
                new Notification('Failed',{
                    body: 'Failed'
                });
            }
        },
        getSearch: async function(){
            this.loading = true;
            const userData = store.get('userData');
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            if(this.q){
                const result = await ClubHouseApi.api.searchUsers(profile,{query:this.q});
                console.log(result);
                if(result.success){
                    this.users = result.users;
                    this.loading=false;
                }else{
                    console.error(result);
                    new Notification('Failed',{
                        body: result.error_message
                    });
                }
            }
        },
        handleSearch:function(){
            this.$router.push({name:'search',params:{q:this.searchQuery}});
        }
    },
    watch: {
        '$route.params': {
            handler(newValue) {
                const { q } = newValue
                
                this.getSearch(newValue);
            },
            immediate: true,
        }
    },
    template: `
        <div>
            <div class="loading mt-5" v-if="loading"><div></div><div></div><div></div><div></div></div>
            <div v-if="!loading" class="center justify-content-start users-list-page">
                <div class="card p-4 my-5 max-width-500 mt-5 mx-auto">
                    <div class="d-flex align-items-center justify-content-between">
                        <span class="text-muted cursor-pointer" @click="$router.go(-1)">Go Back</span>
                        <i class="far fa-home text-muted cursor-pointer" @click="$router.replace('/')"></i>
                    </div>
                    <strong class="d-block text-center border-bottom pb-3" v-if="!q">{{this.type === 'followers' ? 'Followers' : 'Followings'}}</strong>
                    <div class="py-3 border-bottom" v-if="q">
                        <form class="search-input w-100 mx-auto" @submit="handleSearch">
                            <input type="text" placeholder="Search" v-model="searchQuery"/>
                            <i class="far fa-search" @click="handleSearch"></i>
                        </form>
                    </div>
                    <div class="users-list">
                        <user-h :user="user" v-for="user in users"></user-h>
                    </div>
                </div>
            </div>
        </div>
    `
};

export default UserList;