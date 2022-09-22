import { ElementRef, Injectable } from '@angular/core';
import { DataService } from './data.service';
import { of, Observable, forkJoin } from 'rxjs';
import { mergeMap, map, finalize, catchError, groupBy } from 'rxjs/operators';
import { RepairTask } from '../Models/DataModels/repairTask';
import { InfrastructureJob } from '../Models/DataModels/infrastructureJob';
import { IRawInfrastructurePendingUpdate } from '../Models/RawDataTypes';

const GuestRepairActions = ["System.Azure.TenantInitiatedGuestUpdate", "System.Azure.TenantInitiatedGuestAndHostUpdate"];
const HostRepairActions = ["System.Azure.TenantInitiatedHostUpdate", "System.Azure.TenantInitiatedGuestAndHostUpdate"];

export enum NodeUpdateStatus {
    Ok = 'Ok',
    Pending = 'Pending',
    InProgress = 'InProgress',
}

export interface INodeUpgradeRequestContext {
    repairTask: RepairTask;
    infraJob?: InfrastructureJob;
};

export interface INodeUpdateStatus {
    nodeName: string;
    guestStatus: NodeUpdateStatus;
    hostStatus: NodeUpdateStatus;

    context: INodeUpgradeRequestContext[];
};

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
            repairTasks: this.data.repairCollection.ensureInitialized(),
            infrastructureJobs: this.data.infrastructureCollection.ensureInitialized(),
        })
        .pipe(map(() => {
            const nodes = this.data.nodes.collection;
            const pendingUpdates = this.data.infrastructurePendingUpdatesCollection.collection;
            const repairTasks = this.data.repairCollection.collection;
            const infrastructureJobs = this.data.infrastructureCollection.collection
                .reduce((acc, val) => [...acc, ...val.raw.Jobs], []);

            const nodeLevelRepairs = repairTasks.filter(r => GuestRepairActions.includes(r.raw.Action)
                                                          || HostRepairActions.includes(r.raw.Action));

            return nodes.map(node => {
                const nodeNLURepairs = nodeLevelRepairs
                    .filter(r => r.raw.Target?.NodeNames.indexOf(node.name) !== -1);                
                const isGuestPending = pendingUpdates
                    .some(pu => pu.raw.RoleInstanceName.replace("_IN_", '.') === node.name);

                return {
                    nodeName: node.name,
                    guestStatus: this.getGuestStatus(nodeNLURepairs, isGuestPending),
                    hostStatus: this.getHostStatus(nodeNLURepairs),
                    context: this.buildContext(nodeNLURepairs, infrastructureJobs),
                };
            });
        }));
    }

    private static compareRepairCreateDate(a: RepairTask, b: RepairTask): number {
        const aCreatedDate = new Date(a.raw.History?.CreatedUtcTimestamp ?? 0);
        const bCreatedDate = new Date(b.raw.History?.CreatedUtcTimestamp ?? 0);

        return bCreatedDate.getTime() - aCreatedDate.getTime();
    }

    private buildContext(nodeNLURepairs: RepairTask[], infraJobs: InfrastructureJob[]): INodeUpgradeRequestContext[] {
        return nodeNLURepairs.map(r => {
            // try to find a matching infra jobs
            const infraJob = infraJobs.filter(i => i.RepairTask.TaskId === r.id).shift();
            return {
                repairTask: r,
                infraJob: infraJob,
            }
        });
    }

    private getGuestStatus(nodeNLURepairs: RepairTask[], isGuestPending: boolean): NodeUpdateStatus {
        const lastGuestRepair = nodeNLURepairs
            .filter(r => GuestRepairActions.includes(r.raw.Action))
            .sort(NodeLevelUpdatesService.compareRepairCreateDate)
            .shift();
        const isGuestInProgress = lastGuestRepair && lastGuestRepair.raw.State !== "Completed";
        return isGuestInProgress ? NodeUpdateStatus.InProgress
                                 : (isGuestPending ? NodeUpdateStatus.Pending : NodeUpdateStatus.Ok);
    }

    private getHostStatus(nodeNLURepairs: RepairTask[]): NodeUpdateStatus {
        const lastHostRepair = nodeNLURepairs
            .filter(r => HostRepairActions.includes(r.raw.Action))
            .sort(NodeLevelUpdatesService.compareRepairCreateDate)
            .shift();
        const isHostInProgress = lastHostRepair && lastHostRepair.raw.State !== "Completed";
        return isHostInProgress ? NodeUpdateStatus.InProgress : NodeUpdateStatus.Ok;
    }
}