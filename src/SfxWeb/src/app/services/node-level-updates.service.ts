import { ElementRef, Injectable } from '@angular/core';
import { DataService } from './data.service';
import { of, Observable, forkJoin } from 'rxjs';
import { mergeMap, map, finalize, catchError, groupBy } from 'rxjs/operators';

export enum NodeUpdateStatus {
    Ok = 'Ok',
    Pending = 'Pending',
    InProgress = 'InProgress',
}

export interface INodeUpdateStatus {
    nodeName: string;
    status: NodeUpdateStatus;
}

@Injectable({
    providedIn: 'root'
})
export class NodeLevelUpdatesService {
    public containerRef: ElementRef;
    
    constructor(private data: DataService) {}

    public getNodeStatus() : Observable<INodeUpdateStatus[]> {
        return forkJoin({
            nodes: this.data.nodes.ensureInitialized(),
            pendingUpdates: this.data.infrastructurePendingUpdatesCollection.ensureInitialized(),
            repairTasks: this.data.repairCollection.ensureInitialized()
        })
        .pipe(map(() => {
            const nodes = this.data.nodes.collection;
            const pendingUpdates = this.data.infrastructurePendingUpdatesCollection.collection;
            const repairTasks = this.data.repairCollection.collection;

            const nodeLevelRepairs = repairTasks.filter(r => r.raw.Action.startsWith("TenantInitiated"));

            return nodes.map(node => {            
                const lastRepair = nodeLevelRepairs
                    .filter(r => r.raw.Target?.NodeNames.indexOf(node.name) !== -1)
                    .filter(r => r.raw.History?.CreatedUtcTimestamp)
                    .sort((a, b) =>  {
                        const aCreatedDate = new Date(a.raw.History?.CreatedUtcTimestamp ?? 0);
                        const bCreatedDate = new Date(b.raw.History?.CreatedUtcTimestamp ?? 0);

                        return bCreatedDate.getTime() - aCreatedDate.getTime();
                    })
                    .shift();
                const isInProgress = lastRepair && lastRepair.raw.State !== "Completed";
                const isPending = pendingUpdates.some(pu => pu.raw.RoleInstanceName.replace("_IN_", '.') === node.name);

                const nodeStatus = isInProgress ? NodeUpdateStatus.InProgress
                                                : (isPending ? NodeUpdateStatus.Pending : NodeUpdateStatus.Ok);
                return {
                    nodeName: node.name,
                    status: nodeStatus,
                };
            });
        }));        
    }
}