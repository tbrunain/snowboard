// State object
import {ErrorContext, HealthCheck} from "@/types";
import {Actions, Context, Getters, Module, Mutations} from "vuex-smart-module";
import {Api, ApiState} from "@/store/modules/api.store";
import {Store} from "vuex";
import {nodeApi} from "@/AVA";

class HealthState {
    healthy = false;
    checks: HealthCheck = {
        contiguousFailures: 0,
        duration: 0,
        networkValidatorsHeartbeat: {message: {heartbeat: 0}},
        timeOfFirstFailure: 0,
        timestamp: ""
    }
    loading = new Map();
    error = new Map();
}

class HealthGetters extends Getters<HealthState> {

}

class HealthMutations extends Mutations<HealthState> {
    setHealthy(healthy: boolean) {
        this.state.healthy = healthy;
    }

    setError(error: ErrorContext) {
        this.state.healthy = false;
        this.state.error.set(error.key, error.error)
    }
}

class HealthActions extends Actions<HealthState,
    HealthGetters,
    HealthMutations,
    HealthActions> {
    // ToDo Figure this one out
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    api: Context<typeof Api>;

    $init(store: Store<ApiState>): void {
        // Create and retain foo module context
        this.api = Api.context(store)
    }

    async fetchLiveness() {
        const api = nodeApi;
        await api.Health().getLiveness();
        this.mutations.setHealthy(true)
        // axios
        //     .post(this.api.getters.nodeUrl + '/ext/health', {
        //         "jsonrpc": "2.0",
        //         "id": 1,
        //         "method": "health.getLiveness"
        //     })
        //     //ToDo We can do more with the response of that call .
        //     .then((response) => this.mutations.setHealthy(response.data.result))
        //     .catch((e) => {
        //         this.mutations.setError({key: 'helatCheck' ,error: e});
        //     })
    }
}

export const Health = new Module({
    state: HealthState,
    getters: HealthGetters,
    mutations: HealthMutations,
    actions: HealthActions
})