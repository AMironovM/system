import { nodes, SIZES, states, settings, addResourseNode, addNode, addEdge , getEdgeLabels} from './graph.js'

import {
    getVectorCoordinates
} from './misc.js'

const X_OFFSET = 5000
const BRANCH_DISTANCE = 500

export function drawBusinessTree(business) {

    if (!business){
        return
    }
 
    const centerLabel = '<b>' + settings.userDrawnName + '</b>'
    const centerNodeId = "business_resourse_" + settings.userDrawnId
    const centerCoordinates = { x: states.center.x - X_OFFSET, y: states.center.y }

    let centerNode = { id: centerNodeId, label: centerLabel, coordinates: centerCoordinates }

    if (settings.userImage) {
        centerNode = { ...centerNode, shape: 'circularImage', image: settings.userImage, imageSize: SIZES.NODE_IMAGE }
    }

    addNode(centerNode)

    let partnerDeals = business.filter(deal => {
        return deal.contractor.id == settings.userDrawnId
    })

    let angles = [90, 270, 135, 225, 180]

    partnerDeals.forEach((deal, ind) => {

        const partnerAngle = angles[ind % angles.length]
        const partnerCoordinates = getVectorCoordinates(partnerAngle, BRANCH_DISTANCE,  { x: states.center.x - X_OFFSET, y: states.center.y })

        const partnerNode = addResourseNode(deal.employer, 'business_resourse_', false, { coordinates: partnerCoordinates })

        const edgeLabel = getEdgeLabels([deal])

        addEdge({id1: partnerNode.id, id2: centerNodeId, direction: 'to', label: edgeLabel.employerLabel})

        const midPoint = {x: (centerCoordinates.x + partnerCoordinates.x) / 2, y:  (centerCoordinates.y + partnerCoordinates.y) / 2}
        const objectCoordinates = getVectorCoordinates(180, BRANCH_DISTANCE / 2,  midPoint)

        const objectNode = addResourseNode(deal.object, 'business_resourse_', false, { coordinates: objectCoordinates, minAngle:90, maxAngle:270, level: 1})

        addEdge({id1: centerNodeId, id2: objectNode.id, direction: 'to'})
        addEdge({id1: partnerNode.id, id2: objectNode.id, direction: 'to'})

        const objectDeals = business.filter(filteredDeal => {
            return (filteredDeal.object.id == deal.object.id)
        })

        drawObjectTree(settings.userDrawnId, objectCoordinates, deal.object.id, objectNode.node)


    });

    function drawObjectTree(parentId, parentCoordinates, objectId, parentNode){

        const deals = business.filter(deal => {
            return (deal.employer.id == parentId && deal.object.id == objectId)
        })

        const sectorAngle = (parentNode.maxAngle - parentNode.minAngle) / deals.length

        deals.forEach((deal, ind) => {

            const minAngle = parentNode.minAngle + sectorAngle * (ind)
            const maxAngle = parentNode.minAngle + sectorAngle * (ind + 1)
            const descendantAngle = (maxAngle + minAngle) / 2
            const descendantCoordinates = getVectorCoordinates(descendantAngle, BRANCH_DISTANCE * parentNode.level,  parentCoordinates)
            const contractorNode = addResourseNode(deal.contractor, 'business_resourse_', false, { coordinates: descendantCoordinates, minAngle, maxAngle, level: parentNode.level + 1})  

            const edgeLabel = getEdgeLabels([deal])
            addEdge({id1: parentNode.id, id2: contractorNode.id, direction: 'to', label: edgeLabel.employerLabel})

            drawObjectTree(deal.contractor.id, parentCoordinates, objectId, contractorNode.node)

        })

    }
    
}