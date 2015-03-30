// {
//   "name": "user",
//   "calls": [
//     {
//       "parameters": [
//         "freiksenet"
//       ]
//     }
//   ],
//   "type": "call",
//   "properties": [
//     {
//       "name": "handle",
//       "type": "field"
//     },
//     {
//       "name": "microposts",
//       "properties": [
//         {
//           "name": "edges",
//           "properties": [
//             {
//               "name": "text",
//               "type": "field"
//             },
//             {
//               "name": "createdAt",
//               "type": "field"
//             }
//           ],
//           "type": "nested"
//         },
//         {
//           "name": "count",
//           "type": "field"
//         }
//       ],
//       "type": "nested"
//     }
//   ],
//   "root": true
// }

// {
//   "Micropost": {
//     "name": "Micropost",
//     "properties": {
//       "author": {
//         "name": "author",
//         "type": "LINK",
//         "linkedClass": "User"
//       },
//       "text": {
//         "name": "text",
//         "type": "STRING",
//         "linkedClass": null
//       },
//       "created_at": {
//         "name": "created_at",
//         "type": "DATETIME",
//         "linkedClass": null
//       }
//     }
//   },
//   "User": {
//     "name": "User",
//     "properties": {
//       "handle": {
//         "name": "handle",
//         "type": "STRING",
//         "linkedClass": null
//       },
//       "microposts": {
//         "name": "microposts",
//         "type": "LINKSET",
//         "linkedClass": "Micropost"
//       }
//     }
//   }
// }
