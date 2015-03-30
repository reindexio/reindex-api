# Summary

## Our requirements for database

* Fast queries for objects
* Fast joins on *->1 (micropost->author->profile-picture)
* Sharding (for scaling)
* Some way to isolate databases of users
* Joins on 1->* are not that important, as we will probably execute them
  separately and combine on client-side
* Schema changes should be lightweight and not involve database locking
  I am more and more inclined to validating stuff ourselves, not via database

## Databases

### Orientdb

+ Fast querying
+ Seems to be shardable
+ Has independent databases on one server
+ Schema is 'database executor side', so seemingly it doesn't affect locking
  This needs more testing

#### Some stuff about joins

There are two ways to do links in orientdb - full graph mode and 'link' mode.

Joins on 'link' mode are easy for *->1, it's automatic, I don't even need to do
anything, but listing the fields. Very nice. However with this method, the
'reverse' relations are done like with normal relational database. I guess
that's fine? I am not sure. I however think that the *->1 joins are brilliant,
cause they are fast and direct, there is no need to do actual 'table-scan' join.

However we would need to keep some additional metadata about relations on the
User side, probably with names of fields that you reverse query with.

In graph mode it's a bit more complicated, as all the links are *->* and two
sided. The benefit of that is that we can follow the relations bacwards easily.

We can also maintain backwards relation ourselves, on client side, using links.

### neo4j

+ Fast querying
* Sharding with enterprise
+ Has independent databases on one server
* No schema

### PostgreSQL (or other databases like that)

+ Fast querying
+ Fast joins on *->1
+ Easy to do 1->* queries
+ Independent database on one server
- Sharding is seemingly possible, but is not op-friendly
- Schema changes lock database, esp if sharding with slony is there

### MongoDB, rethinkdb

+ Fast querying
- Joins are impossible in mongo and are reportedly slow in rethinkdb
  It's document oriented, our data is *not* nested
+ Doing 1->* is not hard
+ Should be shardable
+ Independent databases on one server (I think)
* No schema

## Conclusion

Test OrientDB more, test neo4j.

# Examples of queries in graphql and target languages

## Facebook newsfeed

```graphql
Story {
  author {
    name,
    profile_picture {
      uri
    }
  },
  text
}
```

```graphql
Viewer {
  stories(first: <count>) {        /* fetch viewer's stories */
    edges {                        /* traverse the graph */
      node {
        ${Story.getQuery('story')} /* compose child query */
      }
    }
  }
}

Viewer() {
  stories.first(3) {
    edges {
      node {
        author {
          name,
          profile_picture {
            uri
          }
        },
        text
      }
    }
  }
}
```

* Will that interpolate (id) into the story? I guess that *yes*
* Will Viewer be converted to Viewer()? Or Viewer(id)?
* Seems that 'reverse' (in?) connections are usually implied to be scalar
* Edges seems to be a magical keyword 'get list of the connections'
* Stories also has count, that is consistent with how orientdb stores the links
* Will count in stories(first: count) have count of count or total count?
* Is stories(first: count) a new syntax for stories.first(count)?
* Wtf is node needed for? Just a wrapper over results? Can prolly get rid of it
* I guess the 'root' call is eliminated when the queries are combined

## Ruby stuff

```graphql
handle(mario) {
  handle,
  about,
  microposts.first(2) {
    count,
    edges {
      node {
        content,
        stars
      }
    }
  }
}
```

```graphql
micropost(11, 15) {
  content,
  stars,
  user { handle }
}
```

* That still has () after each root call and .first() syntax
* Has edges and nodes

## Concerns about querying this

* We have deeply nested stuff, that will be extrapolated to nested stuff, so we
need to unflatten
* We have multiple joins with a limit on their size that is varyadic
  (one related that'll have 'all', another that'll have 'first')
  That is basically impossible in one sql query
* So we pretty much need to do multiple queries

## Ideas using OrientDB

```sql
SELECT handle, about FROM [<id>]
SELECT count(), content, stars FROM micropost WHERE author=[<id>] LIMIT <count>
```

```sql
SELECT author.handle as author_handle, text FROM Story
```

If reverse relations are there

```sql
select handle, about, microposts.size() from [<id>]
select content, stars FROM (SELECT expand(microposts) from [<id>])
```

## Ideas using django ORM

* Optimizations include using only to get only a subset of fields

### Benefits

* Very rich introspection API

### Problems

* Programmatically generating models is impossible or hard
  Maybe SQL alchemy?

### Micropost

```python
o = Story.objects.select_related('author', 'author__profile_picture').get(<id>)
author__profile__serializer = serializers.SerializerMetaclass.__new__(
    'author__profile__serializer',
    [serializer.Serializers],
    {
        'Meta': object.__new__('Meta', [], {
            'model': ProfilePicture,
            'fields': ['url']
        })
    }
)
### moar serializers
s = story_serializer(o)
return s.data
```

```python
class EdgeSerializer(serializers.Serializer):
    count = serializers.IntegerField(allow_null=True, default=None)
    edges = serializers.ListField(
        child = serializers.DictField()
    )

o = User.objects.get(<id>)
q = o.stories__set
stories = q.all()[:count]
stories_count = q.count()
### generate serializers
### for user serializer stories is EdgeSerializer(many=True)
stories_s = story_serializer(stories)
u.stories = {edges: stories_s.data, count: stories_count}
s = user_serializer(u)
return s.data
```
