import * as THREE from "three";
import * as OBC from "@thatopen/components";

export class HelloWorldComponents extends OBC.Component
  implements OBC.Disposable, OBC.Updateable {
    static readonly uuid = "0f89b34b-fc6b-4b97-b56d-1edeb0a308a2";

    readonly onAfterUpdate: OBC.Event<any> = new OBC.Event();
    readonly onBeforeUpdate: OBC.Event<any> = new OBC.Event();
    readonly onDisposed: OBC.Event<any> = new OBC.Event();

    enabled: boolean = true;
    someMesh = new THREE.Mesh();
    
    
    private readonly msg = "Hello";

    constructor(components: OBC.Components) {
      super(components);
      components.add(HelloWorldComponents.uuid, this);
    }

    greet(name: string) {
      console.log(`${this.msg} ${name}}!`);
    }

    dispose() {
      this.enabled = false;
      this.onBeforeUpdate.reset();
      this.onAfterUpdate.reset();

      const disposer = this.components.get(OBC.Disposer);
      disposer.destroy(this.someMesh);
      this.onDisposed.trigger();
      this.onDisposed.reset();
    }

    async update(delta?: number) {
      this.onBeforeUpdate.trigger();
      console.log(`Updated! Delta ${delta}`);
      this.onAfterUpdate.trigger();
    }
}

