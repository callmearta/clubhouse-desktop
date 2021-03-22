const ClubHouseApi = require('clubhouse-api');
const store = require('store');

const Club = {
    props:['id'],
    mounted:function(){
        this.getClub();
    },
    data:function(){
        return {
            club: null,
            loading:true,
        };
    },
    methods:{
        getClub: async function(){
            const userData = store.get('userData');
            this.loading = true;
            const profile = {
                ...ClubHouseApi.profiles.application.a304,
                ...ClubHouseApi.profiles.locales.English,
                userId: userData.user_profile.user_id,
                token: userData.auth_token
            };
            const result = await ClubHouseApi.api.getClub(profile,Number(this.id));
            console.log(result);
            if(result.success){
                this.club = result;
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

            const result = await ClubHouseApi.api.followClub(profile,Number(this.id));
            console.log('follow');
            console.log(result);
            if(result.success){
                this.$set(this.club,'is_follower',true);
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
            const result = await ClubHouseApi.api.unfollowClub(profile,Number(this.id));
            console.log('unfollow');
            console.log(result);
            if(result.success){
                this.$set(this.club,'is_follower',false);
            }else{
                console.error(result);
            }
        },
        enlargeImg: function(){
            const enlargedWrapper = document.createElement('div');
            enlargedWrapper.id = "enlarged";
            const enlargedImg = document.createElement('img');
            enlargedImg.src = this.club.club.photo_url;
            enlargedWrapper.appendChild(enlargedImg);
            enlargedWrapper.addEventListener('click',function(e){
                e.preventDefault();
                this.remove();
            });
            document.body.append(enlargedWrapper);
        },
    },
    watch: {
        '$route.params': {
            handler(newValue) {
                const { id } = newValue
                
                if(!this.loading){
                    this.getClub();
                }
            },
            immediate: true,
        },
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
                <div class="d-flex align-items-center justify-content-center flex-column" v-if="club">
                    <div class="user-page-img-outer has-badge">
                        <div class="user-page-img" @click="enlargeImg">
                            <img :src="club.club.photo_url" />
                        </div>
                    </div>
                    <h1 class="h5 mb-0 mt-3">{{club.club.name}}</h1>
                    <small class="text-muted">{{club.club.num_online}} Online Members</small>
                    <button class="btn-primary mt-3" @click="follow" v-if="club.club.is_follow_allowed && !club.is_follower">Follow</button>
                    <button class="btn-primary mt-3" @click="unfollow" v-if="club.is_follower">Unfollow</button>
                    <div class="d-flex align-items-center justify-content-center mt-3">
                        <span class="mr-3 color-dark">{{club.club.num_followers}} Followers</span>
                        <span class="color-dark">{{club.club.num_members}} Members</span>
                    </div>
                    <section v-if="club.club.description && club.club.description.length">
                        <pre class="w-100">{{club.club.description}}</pre>
                    </section>
                    <section v-if="club.club.rules && club.club.rules.length" class="mt-2 pt-3 border-top">
                        <span class="d-block text-left text-muted">Rules:</span>
                        <div v-for="rule in club.club.rules">
                            <strong>{{rule.title}}</strong>
                            <pre>{{rule.desc}}</pre>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </div>
    `
}

export default Club;