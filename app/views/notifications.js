const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const Notifications = {
    mounted:function(){
        this.getNotifications();
    },
    data:function(){
        return {
            notifications: null,
            loading:true
        }
    },
    methods:{
        getNotifications: async function(){
            const userData = store.get('userData');
            console.log(userData);
            const profiles = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.getNotifications(profiles);
            console.log(result);
            if(result.success){
                this.loading = false;
                this.notifications = result.notifications;
            }else{
                console.error(result);
                new Notification('Failed',{
                    body: result.error_message || ''
                });
            }
        }
    },
    template: `
        <div>
            <div class="loading mt-5" v-if="loading"><div></div><div></div><div></div><div></div></div>
            <div v-if="!loading" class="user-page center justify-content-start">
                <div class="card p-4 my-5 max-width-500 mt-5 mx-auto">
                    <div class="d-flex align-items-center justify-content-start">
                        <span class="text-muted cursor-pointer" @click="$router.go(-1)">Go Back</span>
                    </div>
                    <strong class="d-block text-center border-bottom pb-3 mb-3">Notifications</strong>
                    <router-link :to="{name:'user',params:{id:notif.user_profile.user_id}}" class="user-h" v-if="notif.user_profile" v-for="notif in notifications">
                        <div class="user-img">
                            <img :src="notif.user_profile.photo_url" />
                        </div>
                        <div class="user-details">
                            <strong class="d-block">{{notif.user_profile.name}}</strong>
                            <small class="d-block text-muted">{{notif.message}}</small>
                            <small class="d-block text-muted">{{(new Date(notif.time_created)).toLocaleString()}}</small>
                        </div>
                    </router-link>
                </div>
            </div>
        </div>
    `
};

export default Notifications;