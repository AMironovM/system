import { nodes, SIZES, states, settings, addResourseNode, addNode, addEdge } from './graph.js'

import {
    getVectorCoordinates
} from './misc.js'

const TREE_BRANCH_DISTANCE = 300
const TREE_CHILD_BRANCH_DISTANCE = 500
const X_OFFSET = 5000

const resourses = []

let ancestoryDeals

export function drawTree(ancestory) {

    ancestoryDeals = ancestory

    resourses.length = 0

    // if (!ancestory.parents && !ancestory.partners) {
    //     return
    // }

    const centerLabel = '<b>' + settings.userDrawnName + '</b>'
    const centerNodeId = "tree_resourse_" + settings.userDrawnId
    const centerCoordinates = { x: states.center.x - X_OFFSET, y: states.center.y }

    let centerNode = { id: centerNodeId, label: centerLabel, coordinates: centerCoordinates, minAngle: -90, maxAngle: 90 }

    if (settings.userImage) {
        centerNode = { ...centerNode, shape: 'circularImage', image: settings.userImage, imageSize: SIZES.NODE_IMAGE }
    }

    addNode(centerNode)

    addFilterNode({ id: 'addSecondAncestors', label: 'Двоюродные', x: centerCoordinates.x, y: centerCoordinates.y - 300 }, settings.addSecondAncestors == true, centerNodeId)

    function addFilterNode(node, filterOn, parentNodeId) {
        node.size = filterOn ? SIZES.NODE_BOX * 1.4 : SIZES.NODE_BOX * 0.7
        node.fontSize = filterOn ? 24 : 14
        node.opacity = filterOn ? 1 : 0.4
        addNode(node)
        addEdge({ id1: node.id, id2: parentNodeId })
    }

    drawParentsAndChildren(settings.userDrawnId, centerCoordinates)

    // drawParents(ancestory.parents, "tree_center", 1, -90, 90, ancestory.self.id === settings.partnerId)
    // drawChildren(ancestory.partners, "tree_center", { x: states.center.x - X_OFFSET, y: states.center.y }, ancestory.self.id === settings.partnerId)

}

function drawParents(parentDeal, childNodeId, centerCoordinates) {

    if (!parentDeal) {
        return []
    }

    const childNode = nodes.get(childNodeId)

    let newNodes = []
    let newNode

    const halfAngle = (childNode.maxAngle - childNode.minAngle) / 2
    const parent1angle = childNode.minAngle + halfAngle / 3
    const parent1coordinates = getVectorCoordinates(parent1angle, TREE_BRANCH_DISTANCE, centerCoordinates)
    const parent1nodeId = "tree_resourse_" + parentDeal.employer.id

    // const ignoreNicknamesForParent1 = (ignoreNicknames || parentDeal.employer.id === settings.partnerId || [parents.resourse1.parents?.resourse1?.id, parents.resourse1.parents?.resourse2?.id].includes(settings.partnerId))
    newNode = addResourseNode(parentDeal.employer, 'tree_resourse_', false, { minAngle: childNode.minAngle, maxAngle: childNode.minAngle + halfAngle, x: parent1coordinates.x, y: parent1coordinates.y, subtype: 'treeParent' })

    if (newNode.isNew) {
        newNodes.push({ id: parentDeal.employer.id, center: parent1coordinates })
        // drawParentsAndChildren(parentDeal.employer.id, parent1coordinates)
        const partnerRes = getResourse(parentDeal.employer.id)
        partnerRes.busySlots.push(90)
    }

    // if (parents.resourse1.parents) {
    //     drawParents(parents.resourse1.parents, parent1nodeId, level + 1, minAngle, minAngle + halfAngle, parents.resourse1.id === settings.partnerId)
    // }

    const parent2angle = childNode.minAngle + (halfAngle * 1.66)
    const parent2coordinates = getVectorCoordinates(parent2angle, TREE_BRANCH_DISTANCE, centerCoordinates)
    const parent2nodeId = 'tree_resourse_' + parentDeal.contractor.id

    // const ignoreNicknamesForParent2 = (ignoreNicknames || parents.resourse2.id === settings.partnerId || [parents.resourse2.parents?.resourse1?.id, parents.resourse2.parents?.resourse2?.id].includes(settings.partnerId))

    newNode = addResourseNode(parentDeal.contractor, 'tree_resourse_', false, { maxAngle: childNode.maxAngle, minAngle: childNode.minAngle + halfAngle, x: parent2coordinates.x, y: parent2coordinates.y, subtype: 'treeParent' })

    if (newNode.isNew) {
        newNodes.push({ id: parentDeal.contractor.id, center: parent2coordinates })
        // drawParentsAndChildren(parentDeal.contractor.id, parent2coordinates)
        const partnerRes = getResourse(parentDeal.contractor.id)
        partnerRes.busySlots.push(270)
    }

    const orderedParents = [parentDeal.contractor.id, parentDeal.employer.id].sort()

    const childMainNodeId = 'childrenOf_' + orderedParents[0] + "_" + orderedParents[1]

    const childMainNodeCoordinates = getVectorCoordinates(0, (TREE_BRANCH_DISTANCE) - TREE_BRANCH_DISTANCE * Math.pow(0.5, 1), centerCoordinates)
    addNode({ id: childMainNodeId, size: 40, label: "Дети", x: childMainNodeCoordinates.x, y: childMainNodeCoordinates.y })

    addEdge({ id1: childMainNodeId, id2: parent1nodeId, direction: 'to', length: 0 })
    addEdge({ id1: parent2nodeId, id2: childMainNodeId, direction: 'to', length: 0 })
    addEdge({ id1: childMainNodeId, id2: childNodeId, direction: 'to' })

    // const labelBetweenParents = parents.currency.value > 0 ? parents.currency.value.toString() + parents.currency.symbol : ''
    addEdge({ id1: parent1nodeId, id2: parent2nodeId, label: '', direction: 'to' })

    newNodes.forEach(newNode => {
        drawParentsAndChildren(newNode.id, newNode.center)
    })

    // if (parents.resourse2.parents) {
    //     drawParents(parents.resourse2.parents, parent2nodeId, level + 1, minAngle + halfAngle, maxAngle, parents.resourse2.id === settings.partnerId)
    // }

}

function drawChildren(partners, parentId, parentCoordinates) {

    if (!partners) {
        return
    }

    const parentNodeId = 'tree_resourse_' + parentId
    const parentNode = nodes.get(parentNodeId)

    let angles = [90, 270, 135, 225, 180]

    const parentResourse = getResourse(parentId)

    angles = angles.filter(el => {
        return (!(parentResourse.busySlots.includes(el)))
    })

    // const angleOffset = 180 / (partners.length + ((partners.length % 2 === 0) ? 0 : 1))
    let partnerCount = 0
    let newNodes = []

    partners.forEach(partner => {

        // const isEven = (partnerCount % 2 === 0)
        // const branchCount = Math.floor(partnerCount / 2)

        // let partnerAngle = 0
        // if (isEven) {
        //     partnerAngle = 90 + angleOffset * branchCount
        // } else {
        //     partnerAngle = 270 - (angleOffset * branchCount)
        // }




        const partnerAngle = angles[partnerCount % angles.length]
        let newNode

        const partnerCoordinates = getVectorCoordinates(partnerAngle, TREE_CHILD_BRANCH_DISTANCE, parentCoordinates)
        const partnerNodeId = 'tree_resourse_' + partner.id
        // const ignoreNicknamesForPartner = (partner.id === settings.partnerId || partner.children.map(el => el.id).includes(settings.partnerId))

        newNode = addResourseNode(partner, 'tree_resourse_', false, { x: partnerCoordinates.x, y: partnerCoordinates.y, subtype: 'treePartner', minAngle: -90, maxAngle: 90 })



        if (newNode.isNew) {
            partnerCount++
            const partnerRes = getResourse(partner.id)
            partnerRes.busySlots.push(partnerAngle + (partnerAngle > 180 ? -180 : 180))
            parentResourse.busySlots.push(partnerAngle)

            newNodes.push({ id: partner.id, center: partnerCoordinates })

        }

        const childMainNodeCoordinates = getVectorCoordinates(partnerAngle, TREE_CHILD_BRANCH_DISTANCE / 2, parentCoordinates)

        const orderedParents = [partner.id, parentId].sort()

        const childMainNodeId = 'childrenOf_' + orderedParents[0] + "_" + orderedParents[1]
        addNode({ id: childMainNodeId, size: 40, label: "Дети", coordinates: childMainNodeCoordinates })

        let childCount = 0

        const currencies = {}

        let labelTo = ''
        let labelFrom = ''

        partner.children.forEach(child => {

            let angleCorrection = 0

            if (childCount % 2 == 0) {
                angleCorrection = childCount * 10
            } else {
                angleCorrection = (childCount + 1) * -10
            }

            const mainAngle = 180
            const childCoordinates = getVectorCoordinates(mainAngle + angleCorrection, TREE_CHILD_BRANCH_DISTANCE / 2, childMainNodeCoordinates)

            // let childChildrenIds = []

            // if ('partners' in child) {
            //     childChildrenIds = child.partners.reduce((res, partner) => {
            //         let partnerChildrenIds = partner.children.map(el => el.id)
            //         res = [...res, ...partnerChildrenIds]
            //         return(res)
            //     }, [])

            // }

            // const ignoreNicknamesForChild = (ignoreNicknames || partner.id === settings.partnerId || child.id === settings.partnerId || childChildrenIds.includes(settings.partnerId))
            let newNode = addResourseNode(child.object, 'tree_resourse_', false, { x: childCoordinates.x, y: childCoordinates.y, subtype: 'childTreePartner', minAngle: -90, maxAngle: 90 })
            if (newNode.isNew) {
                // drawParentsAndChildren(child.object.id, childCoordinates)
                newNodes.push({id: child.object.id, center: childCoordinates}) 
            }
            childCount++

            addEdge({ id1: childMainNodeId, id2: 'tree_resourse_' + child.object.id, length: TREE_CHILD_BRANCH_DISTANCE / 3, direction: 'to' })

            if (!(child.currency.id in currencies)) {
                currencies[child.currency.id] = { symbol: child.currency.symbol, gave: 0, received: 0 }
            }

            if (child.contractor.id == partner.id) {
                currencies[child.currency.id].received += child.currency.value
            } else {
                currencies[child.currency.id].gave += child.currency.value
            }

            // if ('partners' in child) {
            //     drawChildren(child.partners, 'childTreePartner_' + child.id, childCoordinates, child.id === settings.partnerId)
            // }

        })



        for (let [id, currency] of Object.entries(currencies)) {
            if (currency.received > 0) {
                labelTo += currency.received.toString() + currency.symbol + ", "
            }
            if (currency.gave > 0) {
                labelFrom += currency.gave.toString() + currency.symbol + ", "
            }
        }

        if (labelFrom.endsWith(', ')) {
            labelFrom = labelFrom.slice(0, -2)
        }


        if (labelTo.endsWith(', ')) {
            labelTo = labelTo.slice(0, -2)
        }



        if (labelTo) {
            addEdge({ id1: parentNodeId, id2: partnerNodeId, direction: 'to', label: labelTo, length: TREE_CHILD_BRANCH_DISTANCE })
        }
        if (labelFrom) {
            addEdge({ id1: partnerNodeId, id2: parentNodeId, direction: 'to', label: labelFrom, length: TREE_CHILD_BRANCH_DISTANCE })
        }

        if (!labelTo && !labelFrom) {
            addEdge({ id1: parentNodeId, id2: partnerNodeId, length: TREE_CHILD_BRANCH_DISTANCE })
        }

        if (labelTo) {
            addEdge({ id1: childMainNodeId, id2: parentNodeId, direction: "to", length: TREE_CHILD_BRANCH_DISTANCE / 60 })
            addEdge({ id1: partnerNodeId, id2: childMainNodeId, direction: "to", length: TREE_CHILD_BRANCH_DISTANCE / 60 })
        } else {
            addEdge({ id1: parentNodeId, id2: childMainNodeId, direction: "to", length: TREE_CHILD_BRANCH_DISTANCE / 60 })
            addEdge({ id1: childMainNodeId, id2: partnerNodeId, direction: "to", length: TREE_CHILD_BRANCH_DISTANCE / 60 })
        }

    })

    newNodes.forEach(newNode => {
        drawParentsAndChildren(newNode.id, newNode.center)
    })

}

function drawParentsAndChildren(resourseId, centerCoordinates) {

    const parentDeal = ancestoryDeals.find(deal => {
        return deal.object.id == resourseId
    })

    drawParents(parentDeal, "tree_resourse_" + resourseId.toString(), centerCoordinates)

    const partners = ancestoryDeals.reduce((res, deal) => {

        let partner

        if (deal.contractor.id == resourseId) {
            partner = deal.employer
        } else if (deal.employer.id == resourseId) {
            partner = deal.contractor
        }

        if (!partner) {
            return res
        }

        let resEl = res.find(el => {
            return el.id == partner.id
        })

        if (!resEl) {
            resEl = partner
            resEl.children = []
            res.push(resEl)
        }

        resEl.children.push(deal)

        return res
    }, [])


    drawChildren(partners, resourseId, centerCoordinates)



    // newNodes.forEach(node => {
    //     drawParentsAndChildren(node.id, node.centerCoordinates)    
    // })

}

function getResourse(id) {
    let resourse = resourses.find(el => {
        return (el.id == id)
    }
    )

    if (!resourse) {
        resourse = { id, busySlots: [] }
        resourses.push(resourse)
    }

    return resourse

}