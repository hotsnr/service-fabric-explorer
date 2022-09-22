import { ElementRef, Injectable } from '@angular/core';
import { DataService } from './data.service';
import { of, Observable, forkJoin } from 'rxjs';
import { mergeMap, map, finalize, catchError, groupBy } from 'rxjs/operators';
import { RepairTask } from '../Models/DataModels/repairTask';

export enum NodeUpdateStatus {
    Ok = 'Ok',
    Pending = 'Pending',
    InProgress = 'InProgress',
}

export interface INodeUpdateStatus {
    nodeName: string;
    guestStatus: NodeUpdateStatus;
    hostStatus: NodeUpdateStatus;
}

@Injectable({
    providedIn: 'root'
})
export class NodeLevelUpdatesService {
    public containerRef: ElementRef;

    constructor(private data: DataService) {}

    public getNodeStatus() : Observable<INodeUpdateStatus[]> {
        const GuestRepairActions = ["TenantInitiatedGuestUpdate", "TenantInitiatedGuestAndHostUpdate"];
        const HostRepairActions = ["TenantInitiatedHostUpdate", "TenantInitiatedGuestAndHostUpdate"];

        return forkJoin({
            nodes: this.data.nodes.ensureInitialized(),
            pendingUpdates: this.data.infrastructurePendingUpdatesCollection.ensureInitialized(),
            repairTasks: this.data.repairCollection.ensureInitialized()
        })
        .pipe(map(() => {
            const nodes = this.data.nodes.collection;
            const pendingUpdates = this.data.infrastructurePendingUpdatesCollection.collection;
            const repairTasks = this.data.repairCollection.collection;

            const nodeLevelRepairs = repairTasks.filter(r => GuestRepairActions.includes(r.raw.Action)
                                                          || HostRepairActions.includes(r.raw.Action));

            return nodes.map(node => {       
                function compareRepairCreateDate(a: RepairTask, b: RepairTask): number {
                    const aCreatedDate = new Date(a.raw.History?.CreatedUtcTimestamp ?? 0);
                    const bCreatedDate = new Date(b.raw.History?.CreatedUtcTimestamp ?? 0);

                    return bCreatedDate.getTime() - aCreatedDate.getTime();
                }

                const nodeNLURepairs = nodeLevelRepairs
                    .filter(r => r.raw.Target?.NodeNames.indexOf(node.name) !== -1);
                const lastGuestRepair = nodeNLURepairs
                    .filter(r => GuestRepairActions.includes(r.raw.Action))
                    .sort(compareRepairCreateDate)
                    .shift();
                const lastHostRepair = nodeNLURepairs
                    .filter(r => HostRepairActions.includes(r.raw.Action))
                    .sort(compareRepairCreateDate)
                    .shift();
                const isGuestInProgress = lastGuestRepair && lastGuestRepair.raw.State !== "Completed";
                const isHostInProgress = lastHostRepair && lastHostRepair.raw.State !== "Completed";

                const isGuestPending = pendingUpdates.some(pu => pu.raw.RoleInstanceName.replace("_IN_", '.') === node.name);

                return {
                    nodeName: node.name,
                    guestStatus: isGuestInProgress ? NodeUpdateStatus.InProgress
                                                   : (isGuestPending ? NodeUpdateStatus.Pending : NodeUpdateStatus.Ok),
                    hostStatus: isHostInProgress ? NodeUpdateStatus.InProgress : NodeUpdateStatus.Ok,
                };
            });
        }));        
    }
}