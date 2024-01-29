import { SIZES, states, settings, addResourseNode, addNode, addEdge } from './graph.js'

import {
    getVectorCoordinates
} from './misc.js'

const TREE_BRANCH_DISTANCE = 300
const TREE_CHILD_BRANCH_DISTANCE = 500
const X_OFFSET = 5000

export function drawTree(ancestory) {

    if (!ancestory.parents && !ancestory.partners) {
        return
    }

    const centerLabel = '<b>' + settings.userDrawnName + '</b>'

    if (settings.userImage) {
        addNode({ id: "tree_center", label: centerLabel, shape: 'circularImage', image: settings.userImage, x: states.center.x - X_OFFSET, y: states.center.y, imageSize: SIZES.NODE_IMAGE })
    } else {
        addNode({ id: "tree_center", label: centerLabel, x: states.center.x - X_OFFSET, y: states.center.y })
    }

    drawParents(ancestory.parents, "tree_center", 1, -90, 90, ancestory.self.id === settings.partnerId)
    drawChildren(ancestory.partners, "tree_center", { x: states.center.x - X_OFFSET, y: states.center.y }, ancestory.self.id === settings.partnerId)

}

function drawParents(parents, childNodeId, level, minAngle, maxAngle, ignoreNicknames) {

    if (!parents) {
        return
    }

    const halfAngle = (maxAngle - minAngle) / 2
    const parent1angle = minAngle + halfAngle / 2
    const parent1coordinates = getVectorCoordinates(parent1angle, TREE_BRANCH_DISTANCE * level, { x: states.center.x - X_OFFSET, y: states.center.y })
    const parent1nodeId = 'treeParent_' + parents.resourse1.id

    const ignoreNicknamesForParent1 = (ignoreNicknames || parents.resourse1.id === settings.partnerId || [parents.resourse1.parents?.resourse1?.id, parents.resourse1.parents?.resourse2?.id].includes(settings.partnerId))
    addResourseNode(parents.resourse1, 'treeParent_', ignoreNicknamesForParent1, { x: parent1coordinates.x, y: parent1coordinates.y, subtype: 'treeParent' })

    if (parents.resourse1.parents) {
        drawParents(parents.resourse1.parents, parent1nodeId, level + 1, minAngle, minAngle + halfAngle, parents.resourse1.id === settings.partnerId)
    }

    const parent2angle = minAngle + (halfAngle * 1.5)
    const parent2coordinates = getVectorCoordinates(parent2angle, TREE_BRANCH_DISTANCE * level, { x: states.center.x - X_OFFSET, y: states.center.y })
    const parent2nodeId = 'treeParent_' + parents.resourse2.id

    const ignoreNicknamesForParent2 = (ignoreNicknames || parents.resourse2.id === settings.partnerId || [parents.resourse2.parents?.resourse1?.id, parents.resourse2.parents?.resourse2?.id].includes(settings.partnerId))

    addResourseNode(parents.resourse2, 'treeParent_', ignoreNicknamesForParent2, { x: parent2coordinates.x, y: parent2coordinates.y, subtype: 'treeParent' })

    const childMainNodeId = 'childrenOf_' + parents.resourse1.id + "_" + parents.resourse2.id
    const childMainNodeCoordinates = getVectorCoordinates(minAngle + halfAngle, (TREE_BRANCH_DISTANCE) * level - TREE_BRANCH_DISTANCE * Math.pow(0.5, level), { x: states.center.x - X_OFFSET, y: states.center.y })
    addNode({ id: childMainNodeId, size: 40, label: "Дети", x: childMainNodeCoordinates.x, y: childMainNodeCoordinates.y })


    addEdge({ id1: childMainNodeId, id2: parent1nodeId, direction: 'to', length: 0 })
    addEdge({ id1: parent2nodeId, id2: childMainNodeId, direction: 'to', length: 0 })
    addEdge({ id1: childMainNodeId, id2: childNodeId, direction: 'to' })

    const labelBetweenParents = parents.currency.value > 0 ? parents.currency.value.toString() + parents.currency.symbol : ''
    addEdge({ id1: parent1nodeId, id2: parent2nodeId, label: labelBetweenParents, direction: 'to' })


    if (parents.resourse2.parents) {
        drawParents(parents.resourse2.parents, parent2nodeId, level + 1, minAngle + halfAngle, maxAngle, parents.resourse2.id === settings.partnerId)
    }

}

function drawChildren(partners, parentId, parentCoordinates, ignoreNicknames) {

    if (!partners) {
        return
    }

    const angleOffset = 180 / (partners.length + ((partners.length % 2 === 0) ? 0 : 1))
    let partnerCount = 0

    partners.forEach(partner => {

        const isEven = (partnerCount % 2 === 0)
        const branchCount = Math.floor(partnerCount / 2)

        let partnerAngle = 0
        if (isEven) {
            partnerAngle = 90 + angleOffset * branchCount
        } else {
            partnerAngle = 270 - (angleOffset * branchCount)
        }

        const partnerCoordinates = getVectorCoordinates(partnerAngle, TREE_CHILD_BRANCH_DISTANCE, parentCoordinates)
        const partnerNodeId = 'treePartner_' + partner.id
        const ignoreNicknamesForPartner = (partner.id === settings.partnerId || partner.children.map(el => el.id).includes(settings.partnerId))

        addResourseNode(partner, 'treePartner_', ignoreNicknamesForPartner, { x: partnerCoordinates.x, y: partnerCoordinates.y, subtype: 'treePartner' })

        const childMainNodeCoordinates = getVectorCoordinates(partnerAngle + 15 * (isEven ? 1 : -1), TREE_CHILD_BRANCH_DISTANCE / 2, parentCoordinates)
        const childMainNodeId = 'childrenOf_' + partner.id
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

            let childChildrenIds = []

            if ('partners' in child) {
                childChildrenIds = child.partners.reduce((res, partner) => {
                    let partnerChildrenIds = partner.children.map(el => el.id)
                    res = [...res, ...partnerChildrenIds]
                    return(res)
                }, [])

            }

            const ignoreNicknamesForChild = (ignoreNicknames || partner.id === settings.partnerId || child.id === settings.partnerId || childChildrenIds.includes(settings.partnerId))
            addResourseNode(child, 'childTreePartner_', ignoreNicknamesForChild, { x: childCoordinates.x, y: childCoordinates.y, subtype: 'childTreePartner' })
            childCount++

            addEdge({ id1: childMainNodeId, id2: 'childTreePartner_' + child.id, length: TREE_CHILD_BRANCH_DISTANCE / 3, direction: 'to' })

            if (!(child.currency.id in currencies)) {
                currencies[child.currency.id] = { symbol: child.currency.symbol, gave: 0, received: 0 }
            }

            if (child.partnerReceivedCurrency) {
                currencies[child.currency.id].received += child.currency.value
            } else {
                currencies[child.currency.id].gave += child.currency.value
            }

            if ('partners' in child) {
                drawChildren(child.partners, 'childTreePartner_' + child.id, childCoordinates, child.id === settings.partnerId)
            }

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
            addEdge({ id1: parentId, id2: partnerNodeId, direction: 'to', label: labelTo, length: TREE_CHILD_BRANCH_DISTANCE })
        }
        if (labelFrom) {
            addEdge({ id1: parentId, id2: partnerNodeId, direction: 'from', label: labelFrom, length: TREE_CHILD_BRANCH_DISTANCE })
        }

        if (!labelTo && !labelFrom) {
            addEdge({ id1: parentId, id2: partnerNodeId, length: TREE_CHILD_BRANCH_DISTANCE })
        }

        addEdge({ id1: childMainNodeId, id2: parentId, direction: labelTo ? "to" : "from", length: TREE_CHILD_BRANCH_DISTANCE / 60 })
        addEdge({ id1: partnerNodeId, id2: childMainNodeId, direction: labelTo ? "to" : "from", length: TREE_CHILD_BRANCH_DISTANCE / 60 })


        partnerCount++

    })

}