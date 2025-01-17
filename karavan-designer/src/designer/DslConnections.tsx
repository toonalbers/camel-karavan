/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';
import './karavan.css';
import {CamelElement, Integration} from "karavan-core/lib/model/CamelDefinition";
import {DslPosition, EventBus} from "./EventBus";
import Rx from 'karavan-core/node_modules/rxjs';
import {CamelUi} from "./CamelUi";
import {ComponentApi} from "karavan-core/lib/api/ComponentApi";

interface Props {
    integration: Integration
    width: number
    height: number
    top: number
}

interface State {
    integration: Integration
    sub?: Rx.Subscription
    steps: Map<string, DslPosition>
}

const overlapGap: number = 32;

export class DslConnections extends React.Component<Props, State> {

    public state: State = {
        integration: this.props.integration,
        steps: new Map<string, DslPosition>(),
    };

    componentDidMount() {
        const sub = EventBus.onPosition()?.subscribe((evt: DslPosition)=> this.setPosition(evt));
        this.setState({sub: sub});
    }

    componentWillUnmount() {
        this.state.sub?.unsubscribe();
    }

    setPosition(evt: DslPosition) {
        if (evt.command === "add") this.setState(prevState => ({steps: prevState.steps.set(evt.step.uuid, evt)}));
        else if (evt.command === "delete") this.setState(prevState => {
            prevState.steps.clear();
            // prevState.steps.delete(evt.step.uuid);
            return {steps: prevState.steps};
        });
    }

    getIncomings() {
        let outs: [string, number][] = Array.from(this.state.steps.values())
            .filter(pos => ["FromDefinition"].includes(pos.step.dslName))
            .sort((pos1: DslPosition, pos2: DslPosition ) => {
                const y1 = pos1.headerRect.y + pos1.headerRect.height / 2;
                const y2 = pos2.headerRect.y + pos2.headerRect.height / 2;
                return y1 > y2 ? 1 : -1
            })
            .map(pos => [pos.step.uuid, pos.headerRect.y]);
        while (this.hasOverlap(outs)){
            outs = this.addGap(outs);
        }
        return outs;
    }

    getIncoming(data: [string, number]) {
        const pos = this.state.steps.get(data[0]);
        if (pos) {
            const fromX = pos.headerRect.x + pos.headerRect.width / 2;
            const fromY = pos.headerRect.y + pos.headerRect.height / 2 - this.props.top;
            const r = pos.headerRect.height / 2;

            const incomingX = 20;
            const lineX1 = incomingX + r;
            const lineY1 = fromY;
            const lineX2 = fromX - r * 2 + 7;
            const lineY2 = fromY;

            const imageX = incomingX - r + 5;
            const imageY = fromY - r + 5;
            return (
                <g key={pos.step.uuid + "-incoming"}>
                    <circle cx={incomingX} cy={fromY} r={r} className="circle-incoming"/>
                    <image x={imageX} y={imageY} href={CamelUi.getIcon(pos.step)} className="icon"/>
                    <path d={`M ${lineX1},${lineY1} C ${lineX1},${lineY2} ${lineX2},${lineY1}  ${lineX2},${lineY2}`}
                          className="path-incoming" markerEnd="url(#arrowhead)"/>
                </g>
            )
        }
    }

    hasOverlap(data: [string, number][]): boolean {
        let result = false;
        data.forEach((d, i, arr) => {
            if (i > 0 && d[1] - arr[i-1][1] < overlapGap) result = true;
        })
        return result;
    }

    addGap(data: [string, number][]): [string, number][] {
        const result: [string, number][] = [];
        data.forEach((d, i, arr) => {
            if (i > 0 && d[1] - arr[i-1][1] < overlapGap) result.push([d[0], d[1] + overlapGap])
            else result.push(d);
        })
        return result;
    }

    getOutgoings():[string, number][] {
        let outs: [string, number][] = Array.from(this.state.steps.values())
            .filter(pos => ['ToDefinition', 'KameletDefinition', 'ToDynamicDefinition', "PollEnrichDefinition", "EnrichDefinition"].includes(pos.step.dslName))
            .sort((pos1: DslPosition, pos2: DslPosition ) => {
                const y1 = pos1.headerRect.y + pos1.headerRect.height / 2;
                const y2 = pos2.headerRect.y + pos2.headerRect.height / 2;
                return y1 > y2 ? 1 : -1
            })
            .map(pos => [pos.step.uuid, pos.headerRect.y - this.props.top]);
        while (this.hasOverlap(outs)){
            outs = this.addGap(outs);
        }
        return outs;
    }

    getOutgoing(data: [string, number]) {
        const pos = this.state.steps.get(data[0]);
        if (pos){
            const fromX = pos.headerRect.x + pos.headerRect.width / 2;
            const fromY = pos.headerRect.y + pos.headerRect.height / 2 - this.props.top;
            const r = pos.headerRect.height / 2;

            const outgoingX = this.props.width - 20;
            const outgoingY = data[1] + 15;

            const lineX1 = fromX + r;
            const lineY1 = fromY;
            const lineX2 = outgoingX - r * 2 + 4;
            const lineY2 = outgoingY;

            const imageX = outgoingX - r + 5;
            const imageY = outgoingY - r + 5;

            let image = CamelUi.getIcon(pos.step);
            if ((pos.step as any).uri){
                const labels =  ComponentApi.findByName((pos.step as any).uri)?.component.label;
                if (labels){
                    // labels
                }
            }

            const lineXi = lineX1 + 40;
            const lineYi = lineY2;

            return (
                <g key={pos.step.uuid + "-outgoing"}>
                    <circle cx={outgoingX} cy={outgoingY} r={r} className="circle-outgoing"/>
                    <image x={imageX} y={imageY} href={image} className="icon"/>
                    <path d={`M ${lineX1},${lineY1} C ${lineXi - 20}, ${lineY1} ${lineX1 - 15},${lineYi} ${lineXi},${lineYi} L ${lineX2},${lineY2}`}
                          className="path-incoming" markerEnd="url(#arrowhead)"/>
                </g>
            )
        }
    }

    getCircle(pos: DslPosition) {
        const cx = pos.headerRect.x + pos.headerRect.width / 2;
        const cy = pos.headerRect.y + pos.headerRect.height / 2 - this.props.top;
        const r = pos.headerRect.height / 2;
        return (
            <circle cx={cx} cy={cy} r={r} stroke="transparent" strokeWidth="3" fill="transparent" key={pos.step.uuid + "-circle"}/>
        )
    }

    hasSteps = (step: CamelElement):boolean => {
        return (step.hasSteps() &&  !['FromDefinition'].includes(step.dslName))
            ||  ['RouteDefinition', 'TryDefinition', 'ChoiceDefinition'].includes(step.dslName);
    }

    getPreviousStep(pos: DslPosition){
        return Array.from(this.state.steps.values())
            .filter(p => pos.parent?.uuid === p.parent?.uuid)
            .filter(p => p.inSteps)
            .filter(p => p.position === pos.position - 1)[0];
    }

    getArrow(pos: DslPosition) {
        const endX = pos.headerRect.x + pos.headerRect.width / 2;
        const endY = pos.headerRect.y - 9 - this.props.top;
        if (pos.parent){
            const parent = this.state.steps.get(pos.parent.uuid);
            if (parent){
                const startX = parent.headerRect.x + parent.headerRect.width / 2;
                const startY = parent.headerRect.y + parent.headerRect.height - this.props.top;
                if (!pos.inSteps || (pos.inSteps && pos.position === 0) && parent.step.dslName !== 'MulticastDefinition'){
                    return (
                        <path d={`M ${startX},${startY} C ${startX},${endY} ${endX},${startY}   ${endX},${endY}`}
                              className="path" key={pos.step.uuid} markerEnd="url(#arrowhead)"/>
                    )
                } else if (parent.step.dslName === 'MulticastDefinition' && pos.inSteps){
                    return (
                        <path d={`M ${startX},${startY} C ${startX},${endY} ${endX},${startY}   ${endX},${endY}`}
                              className="path" key={pos.step.uuid} markerEnd="url(#arrowhead)"/>
                    )
                } else if (pos.inSteps && pos.position > 0 && !this.hasSteps(pos.step)){
                    const prev = this.getPreviousStep(pos);
                    if (prev){
                        const r = this.hasSteps(prev.step) ? prev.rect : prev.headerRect;
                        const prevX = r.x + r.width / 2;
                        const prevY = r.y + r.height - this.props.top;
                        return (
                            <line x1={prevX} y1={prevY} x2={endX} y2={endY} className="path" key={pos.step.uuid} markerEnd="url(#arrowhead)"/>
                        )
                    }
                } else if (pos.inSteps && pos.position > 0 && this.hasSteps(pos.step)){
                    const prev = this.getPreviousStep(pos);
                    if (prev){
                        const r = this.hasSteps(prev.step) ? prev.rect : prev.headerRect;
                        const prevX = r.x + r.width / 2;
                        const prevY = r.y + r.height - this.props.top;
                        return (
                            <line x1={prevX} y1={prevY} x2={endX} y2={endY} className="path" key={pos.step.uuid} markerEnd="url(#arrowhead)"/>
                        )
                    }
                }
            }
        }
    }

    getSvg() {
        const steps = Array.from(this.state.steps.values());
        return (
            <svg
                style={{ width: this.props.width, height: this.props.height, position: "absolute", left: 0, top: 0}}
                viewBox={"0 0 " + this.props.width + " " + this.props.height}>
                <defs>
                    <marker id="arrowhead" markerWidth="9" markerHeight="6" refX="0" refY="3" orient="auto" className="arrow">
                        <polygon points="0 0, 9 3, 0 6" />
                    </marker>
                </defs>
                {steps.map(pos => this.getCircle(pos))}
                {steps.map(pos => this.getArrow(pos))}
                {this.getIncomings().map(p => this.getIncoming(p))}
                {this.getOutgoings().map(p => this.getOutgoing(p))}
            </svg>
        )
    }

    render() {
        return (
            <div className="connections" style={{width: this.props.width, height: this.props.height, marginTop: "8px"}}>
                {this.getSvg()}
            </div>
        );
    }
}