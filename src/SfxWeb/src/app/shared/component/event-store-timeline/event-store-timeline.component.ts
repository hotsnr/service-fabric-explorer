import { Component, ViewChild, ElementRef, Input, AfterViewInit, OnChanges, ChangeDetectionStrategy, Output, EventEmitter, OnDestroy } from '@angular/core';
import { ITimelineData } from 'src/app/Models/eventstore/timelineGenerators';
import { Timeline, DataItem, DataGroup, moment, DataSet } from 'vis-timeline/standalone/esm';

@Component({
  selector: 'app-event-store-timeline',
  templateUrl: './event-store-timeline.component.html',
  styleUrls: ['./event-store-timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventStoreTimelineComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() events: ITimelineData;

  @Input() fitOnDataChange = true;
  @Input() displayMoveToStart = true;
  @Input() displayMoveToEnd = true;

  @Output() itemClicked = new EventEmitter<string>();

  public isUTC = false;

  public showControls = false;

  private timeline: Timeline;
  private start: Date;
  private end: Date;
  private oldestEvent: DataItem;
  private mostRecentEvent: DataItem;

  @ViewChild('visualization') container: ElementRef;


  constructor() { }

  ngOnChanges() {
    if (this.timeline) {
        this.updateList(this.events);
    }
  }

  ngAfterViewInit() {

    const items = this.events.items || new DataSet();

    // create visualization
    this.timeline = new Timeline(this.container.nativeElement, items, {
      locale: 'en_US',
      xss: {
        disabled: true,
        filterOptions: {
          whiteList: {
            "div": ['class', 'inner-tooltip', 'white-space', 'margin-left', 'color'],
            "table": [],
            "tbody": [],
            "tr": [],
            "td": ['class', 'nested-row', 'margin-bottom'],
            "b": [],
            "br": []
          },
          css: {
            'color': true,
            'background-color': true
          }
        }
      }
    });

    this.timeline.on('click', data => {
      this.itemClicked.emit(data.item)
    })

    this.updateList(this.events);
  }

  public flipTimeZone() {
    this.timeline.setOptions({
      moment: this.isUTC ? moment : moment.utc
    });
  }

  public fitData() {
    this.timeline.fit();
  }

  public fitWindow() {
    this.timeline.setWindow(this.start, this.end);
  }

  public moveStart() {
    this.timeline.moveTo(this.start);
  }

  public moveEnd() {
    this.timeline.moveTo(this.end);
  }

  public moveToOldestEvent() {
    if (this.oldestEvent) {
      this.timeline.setWindow(this.oldestEvent.start, this.oldestEvent.end);
    }
  }

  public moveToNewestEvent() {
    if (this.mostRecentEvent) {
      this.timeline.setWindow(this.mostRecentEvent.start, this.mostRecentEvent.end);
    }
  }

  public updateList(events: ITimelineData) {
    if (events.start) {
      this.timeline.setOptions({
        min: events.start,
      });
      this.start = events.start;
    }
    if (events.end) {
      this.end = events.end;
      this.timeline.setOptions({
        max: events.end,
      });
    }

    if (events) {
      if (events.groups) {
        this.timeline.setData({
          groups: events.groups,
        });
      }
      if (events.items) {
        this.timeline.setData({
          items: events.items
        });
      }


      const options = {
        selectable: false,
        template: (itemData, element, data) => {
          if (data.isCluster) {
            return `<div style="background-color:${itemData.items[0].color}">${data.items.length} ${data.items[0].kind} events </div>`
          } else {
            return `<div>${data.content}</div>`;
          }
        },
        margin: {
          item: {
            horizontal: -1 // this makes it so items dont stack up when zoomed out too far.,
          }
        },
        tooltip: {
          overflowMethod: "flip" as any,
          template: (itemData) => {
            if(itemData.isCluster) {
              return `<div class="inner-tooltip">
                  <div>
                  ${itemData.items[0].group} ${itemData.items.length}  events
                  </div>
                  <div>
                    start : ${itemData.items[0].start}
                    <br>
                    end : ${itemData.items[itemData.items.length - 1].start}
                  </div>
              </div>`
            }else {
              return `${itemData.title}`
            }
          }
        },
        stack: true,
        stackSubgroups: true,
        maxHeight: '700px',
        verticalScroll: true,
        cluster: events.allowClustering ? {
          titleTemplate:
            "Cluster containing {count} events. Zoom in to see the individual events.",
          showStipes: true,
          clusterCriteria(firstItem: any, secondItem: any) {
            return firstItem.kind === secondItem.kind
          }
        } : false as any,
      }
      this.timeline.setOptions(options);
      setTimeout(() => {
        this.timeline.redraw();
      }, 1);


      if (this.fitOnDataChange) {
        this.timeline.fit();
      }

      if (events.items.length > 0) {
        let oldest = null;
        let newest = null;

        events.items.forEach(item => {
          // cant easily grab the first elements of the collection, easier to set here
          if (!oldest && !newest) {
            oldest = item;
            newest = item;
          }
          if (oldest.start > item.start) {
            oldest = item;
          }
          if (newest.end < item.end) {
            newest = item;
          }
        });
        this.mostRecentEvent = newest;
        this.oldestEvent = oldest;
      }
    } else {
      this.mostRecentEvent = null;
      this.oldestEvent = null;
      this.timeline.zoomOut(1);
    }
  }

  flipShowControls() {
    this.showControls = !this.showControls;
  }

  ngOnDestroy(): void {
    if(this.timeline){
      this.timeline.destroy();
    }
  }
}
