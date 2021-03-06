// State object
import {Config} from "@/types";
import {chainId, networkId, nodeHost, nodePort, protocol, updateAvalancheApi} from "@/AVA";
import {Actions, Getters, Module, Mutations} from 'vuex-smart-module'

export class ApiState {
    bootstrapApi = {
        nodeUrl: process.env.VUE_APP_SNWBRD_BOOTSTRAP_HOST || 'bootstrap.avax.network',
        protocol: process.env.VUE_APP_SNWBRD_BOOTSTRAP_PROTOCOL || 'https',
        chainId: process.env.VUE_APP_SNWBRD_BOOTSTRAP_CHAIN_ID || 'X',
        nodePort: process.env.VUE_APP_SNWBRD_BOOTSTRAP_PORT || '21000',
        networkId: process.env.VUE_APP_SNWBRD_BOOTSTRAP_NETWORK_ID || '3',
    }
    nodeApi = {
        nodeUrl: nodeHost,
        protocol: protocol,
        chainId: chainId,
        nodePort: nodePort,
        networkId: networkId
    }
}

// Getter functions
class ApiGetters extends Getters<ApiState> {
    get nodeUrl() {
        return this.state.nodeApi.protocol + "://" + this.state.nodeApi.nodeUrl + ":" + this.state.nodeApi.nodePort
    }
}

class ApiMutations extends Mutations<ApiState> {
    updateNodeApiConfig(payload: Config) {
        this.state.nodeApi.nodeUrl = payload.nodeUrl;
        this.state.nodeApi.protocol = payload.protocol;
        this.state.nodeApi.nodePort = payload.nodePort;
        this.state.nodeApi.chainId = payload.chainId;
        this.state.nodeApi.networkId = payload.networkId;
    }
}

class ApiActions extends Actions<ApiState,
    ApiGetters,
    ApiMutations,
    ApiActions> {
    async changeNodeUrl(update: Config): Promise<void> {
        this.mutations.updateNodeApiConfig(update);
        updateAvalancheApi(this.state.nodeApi);
    }
}

export const Api = new Module({
    state: ApiState,
    getters: ApiGetters,
    mutations: ApiMutations,
    actions: ApiActions
})
